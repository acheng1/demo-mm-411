// Customization
var gSkin = '247';
//var gSkin = 'att';

// Business API information
var gResourceRootSslUrl = "https://ec2-184-72-7-75.us-west-1.compute.amazonaws.com";
var gResourceRootUrl    = "http://ec2-184-72-7-75.us-west-1.compute.amazonaws.com";
var gApiPath            = '/perl/demo-411-tmp';
var gSearchServiceURI   = gResourceRootUrl + gApiPath + "/search/search-jsonp.pl";
var gListingServiceURI  = gResourceRootUrl + gApiPath + "/search/details.pl";
var gBusinessSearchNumResults = 10;

var gGrammarRootUrl           = gResourceRootSslUrl + gApiPath + "/grammars/dynamicgram.pl";
var gSearchGrammarRootUrl     = gGrammarRootUrl + "?type=search";
var gListingGrammarRootUrl    = gGrammarRootUrl + "?type=listing";
var gDetailsGrammarRootUrl    = gGrammarRootUrl + "?type=details";
var gDirectionsGrammarRootUrl = gGrammarRootUrl + "?type=directions";
var gShareGrammarRootUrl      = gGrammarRootUrl + "?type=share";
var gAddContactGrammarRootUrl = gResourceRootSslUrl + gApiPath + "/grammars/dynamicgram-contacts.pl?type=contacts";
var gAddContactLimitPerGrammar  = 50;
var gAddContactGrammars         = [];

var gCurrentMeeting = null;
var gUseSuggested = false;

var gLocation = null;
var gChangeSearchString = null;
var gListings = [];
var gSelectedListing = null;

var gRecipientList = [];

var gContactList = [];
var gMeetingList = [];
var gMeetingMaxCount = 5;
var gCalendarInspected = false;
var gShareList = [];

//-----------------------------------------------------------------------------
// HELPERS
//-----------------------------------------------------------------------------
var gDayMapping = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getShortPeriodString(date1, date2) {
    var str = gDayMapping[date1.getDay()] + ' ' + getTimeHourString(date1) + ' - ';
    if (date1.getDay() != date2.getDay()) {
        str += gDayMapping[date2.getDay()] + ' ';
    }

    str += getTimeHourString(date2);

    return str;
}

function isValidMeeting(meeting) {
    if (!meeting) {
        return false;
    }

    if (!meeting.location || meeting.location.match(/[a-z,A-Z]+/) == null) {
        return false;
    }

    if (meeting.allDay == 1) {
        return false;
    }

    if (meeting.status == "cancelled") {
        return false;
    }

    return true;
}

function getShareListFromMeeting(meeting) {
    var list = [];
    if (meeting == null) {
        return list;
    }

    for (var i = 0; i < meeting.participants.length; i++) {
        var participant = meeting.participants[i];
        var email = participant.url.replace("mailto:","");
        var mobile = findMobilePhoneForEmail(email);
        list.push(
                {
                    name : participant.name,
                    email : email,
                    phone : mobile,
                    checked : false
                }
        );
    }

    return list;
}

function getFullNameFromContact(contact) {
    var name = contact.First + (contact.Middle ? ' ' + contact.Middle : '') + (contact.Last ? ' ' + contact.Last : '');
    return name;
}

function getOneEmailFromContact(contact) {
    var email = '';
    if (contact.email.work != null) {
        email = contact.email.work;
    } else if (contact.email.home != null) {
        email = contact.email.home;
    } else if (contact.email.other != null) {
        email = contact.email.other;
    } else if (contact.email.email != null) {
        email = contact.email.email;
    }

    return email;
}

function getMobilePhoneFromContact(contact) {
    var phone = '';
    if (contact.phone.mobile != null) {
        phone = contact.phone.mobile;
    }

    return phone;
}

function addToGlobalShareList(person) {
    if (person.email != null && person.email != '') {
        var elc = person.email.toLowerCase();
        for (var i = 0; i < gShareList.length; i++) {
            var p = gShareList[i];
            if (p.email != null && p.email != '' && p.email.toLowerCase() == elc) {
                // duplicated entry based on email
                return;
            }
        }
    }

    gShareList.push(person);
}

function findMobilePhoneForEmail(email)
{
    var elc = email.toLowerCase();
    for (var i = 0; i < gContactList.length; i++) {
        var contact = gContactList[i];
        if (contact.email.work != null && contact.email.work != '' && contact.email.work.toLowerCase() == elc ||
            contact.email.home != null && contact.email.home != '' && contact.email.home.toLowerCase() == elc ||
            contact.email.email != null && contact.email.email != '' && contact.email.email.toLowerCase() == elc ||
            contact.email.other != null && contact.email.other != '' && contact.email.other.toLowerCase() == elc) {
            if (contact.phone.mobile != null && contact.phone.mobile != '') {
                return contact.phone.mobile;
            }
        }
    }

    return '';
}

//-----------------------------------------------------------------------------

$(document).bind("mobileinit",
    function() {
        $.mobile.defaultPageTransition = "none";
    }
);

$(document).ready( function() {
    $('head').append(
        $('<link>').attr({
             'rel': 'stylesheet'
            ,'type': 'text/css'
            ,'href': 'css/' + gSkin + '.css'
        })
    );
});

//-----------------------------------------------------------------------------

function load() {
    NativeBridge.onInitialize(nbInitialize);
}

function nbInitialize(o) {
}

function emptyCalendarHandler(result) {
}

function emptyGrammarHandler(result) {
}

function globalLocationHandler(result) {
    if (result != null) {
        gLocation = result;

        $('#searchbar').textinput('enable');
        var currentTime = (new Date()).getTime();
        //var currentTime = 1334923200000;
        var endTime = currentTime + 86400000;
        NativeBridge.getEvents(currentTime, endTime, mainpage_calendarHandler);
    }
}

function globalSelectListing(index) {
    if (index >= 0 && gListings.length > index) {
        gSelectedListing = gListings[index];
    }
}

function globalContactsHandler(result) {
    if (result != null) {
        gContactList = [];
        for (var i = 0; i < result.length; i++) {
            var p = result[i];
            var name = getFullNameFromContact(p);
            if (name == undefined || name == '' || name.match(/[@,<,>]+/) != null) {
                // possibly bogus contact name
                continue;
            }

            var email = getOneEmailFromContact(p);
            var mobile = getMobilePhoneFromContact(p);
            if (email == '' && mobile == '') {
                // nothing to share with
                continue;
            }

            gContactList.push(p);
        }

        gContactList.sort(function(a,b) {
            var n1 = getFullNameFromContact(a);
            var n2 = getFullNameFromContact(b);
            if (n1 < n2) {
                return -1;
            } else if (n1 > n2) {
                return 1;
            }
            return 0;
        });

        // Build the add contact grammar once
        gAddContactGrammars = generateAddContactGrammarUrl();
    }
}

//-----------------------------------------------------------------------------
// Page specific functions, local scope
// DO NOT CALL THEM FROM OTHER PAGES
//-----------------------------------------------------------------------------
function mainpage_init() {
//    NativeBridge.setMessage(null);
//    NativeBridge.setGrammar(null, null, emptyGrammarHandler);

    NativeBridge.getLocation(globalLocationHandler);
    NativeBridge.getContacts("", globalContactsHandler);

    // hide back button
    $('#list-back-btn').hide();
}

function mainpage_show() {
    setTimeout("handleNoLocation()", 5000);
}

function handleNoLocation() {
    if (gLocation == null) {
        $('#searchbar').textinput('disable');
        $('#results-container').empty();
        $('<ul>').attr({ 'data-role': 'listview', 'data-inset': 'true', 'id': 'search-results' }).appendTo('#results-container');
            $('<li>').attr({'style': 'text-align:center'}).append(
                    $('<span>').html("Predictive 411 uses your current " +
                                     "location to search for business listings. " +
                                     "For best results, please turn on Location " +
                                     "Services for Px Mobile. Go to the Settings " +
                                     "app, select Location Services, find Px Mobile, " +
                                     "and turn on Location Services.")).appendTo('#search-results');
        $('#results-container').trigger('create');
    }
}

function mainpage_before_show() {
    if (gChangeSearchString != null) {
        $("#searchbar").val(gChangeSearchString);
        gChangeSearchString = null;
        $("#searchform").submit();
    } else if (gListings == null || gListings.length == 0) {
        if (gCurrentMeeting != null) {
            var v = $("#searchbar").val();
            if (v != "") {
                var msg = "Are you looking for '" + v + "'?";
                NativeBridge.setMessage(msg);
                NativeBridge.playTTS("female", "en-US", msg);
                NativeBridge.setGrammar(gSearchGrammarRootUrl, null, mainpage_searchGrammarHandler);
            } else {
                var msg = "What are you looking for?";
                NativeBridge.setMessage(msg);
                NativeBridge.playTTS("female", "en-US", msg);
                NativeBridge.setGrammar(gSearchGrammarRootUrl, null, mainpage_searchGrammarHandler);
            }
        } else {
            if (gCalendarInspected) {
                var msg = "Say the name of a business";
                NativeBridge.setMessage(msg);
                NativeBridge.playTTS("female", "en-US", msg);
                NativeBridge.setGrammar(gSearchGrammarRootUrl, null, mainpage_searchGrammarHandler);
            }
        }
    } else {
        var msg = "Which location?";
        NativeBridge.setMessage(msg);
        NativeBridge.playTTS("female", "en-US", msg);
        NativeBridge.setGrammar(generateListingGrammarUrl(), null, mainpage_listingGrammarHandler);
    }
}

function mainpage_calendarHandler(result) {
    if (result != null && result.length > 0) {
        gMeetingList = result;
        gCurrentMeeting = null;

        // clear results container to handle go back
        $('#results-container').empty();
        // hide back button
        $('#list-back-btn').hide();

        $('#meetings-container').empty();
        $('<ul>').attr({ 'data-role': 'listview', 'data-inset': 'true', 'id': 'meetings' }).appendTo('#meetings-container');

        var count = 0;
        for (var i = 0; i < gMeetingList.length && count < gMeetingMaxCount; i++) {
            var m = gMeetingList[i];
            if (!isValidMeeting(m)) {
                continue;
            }

            count++;

            // truncate meeting location
            m.ttslocation = truncate(m.location, 30);

            if (gCurrentMeeting == null) {
                gCurrentMeeting = m;
                gShareList = getShareListFromMeeting(gCurrentMeeting);
                $("#searchbar").val(gCurrentMeeting.ttslocation);
                var msg = "Are you looking for '" + gCurrentMeeting.ttslocation + "'?";
                NativeBridge.setMessage(msg);
                NativeBridge.playTTS("female", "en-US", msg);
                NativeBridge.setGrammar(gSearchGrammarRootUrl, null, mainpage_searchGrammarHandler);
            }

            var time = getTimeHourString((new Date(m.startDate)));
            var remaining = getTimeRemaining((new Date(m.startDate)));
            var remainingContent = '';
            if (remaining == 0) {
                remainingContent = 'now';
            } else if (remaining == 1) {
                remainingContent = '1 minute from now';
            } else if (remaining <= 30) {
                remainingContent = (remaining + ' minutes from now');
            }
            var includeDash = remaining > 30 ? '' : ' - ';
            $('<li>').attr({'data-icon':'custom-arrow-r'}).append(
                $('<a>').attr({ 'href': '#', 'onclick': 'mainpage_selectMeeting(' + i + ');return false;'}).append(
                    $('<img>').attr({'src':'images/transparent.gif',
                                     'width':'1px',
                                     'height':'1px',
                                     'class':'ui-li-icon ui-corner-none calendar-icon'})).append(
                    $('<span>').attr('class', 'meeting-name')
                        .html(m.title + '<br />')).append(
                    $('<span>').attr('class', 'meeting-address')
                        .html(m.location + '<br />')).append(
                    $('<span>').attr('class', 'meeting-time')
                        .html(time + includeDash)).append(
                    $('<span>').attr({'class' : 'meeting-time-remaining'})
                        .html(remainingContent))).appendTo("#meetings");
        }

        $('#meetings-container').trigger('create');
    } else {
        // no meeting found
        var msg = "Say the name of a business";
        NativeBridge.setMessage(msg);
        NativeBridge.playTTS("female", "en-US", msg);
        NativeBridge.setGrammar(gSearchGrammarRootUrl, null, mainpage_searchGrammarHandler);
        gUseSuggested = true;
    }

    gCalendarInspected = true;
}

function mainpage_selectMeeting(index) {
    if (index >= 0 && gMeetingList.length > index) {
        gCurrentMeeting = gMeetingList[index];
        gShareList = getShareListFromMeeting(gCurrentMeeting);
        $("#searchbar").val(gCurrentMeeting.ttslocation);
        $("#searchform").submit();
    }
}


function mainpage_searchGrammarHandler(result) {
    if (result != null && result.length > 0) {
        var interp = result[0].interpretation;
        var regexmatch = null;
        if (interp == "yes") {
            $("#searchform").submit();
        } else if (interp == "no") {
            $("#searchbar").val("");
            var msg = "What are you looking for?";
            NativeBridge.setMessage(msg);
            NativeBridge.playTTS("female", "en-US", msg);
            NativeBridge.setGrammar(gSearchGrammarRootUrl, null, mainpage_searchGrammarHandler);
        } else if ((regexmatch = interp.match(/^yes,(.+)/i)) != null) {
            $("#searchbar").val($("#searchbar").val() + ", " + regexmatch[1]);
            $("#searchform").submit();
        } else if ((regexmatch = interp.match(/^no,(.+)/i)) != null) {
            gUseSuggested = true;

            $("#searchbar").val(regexmatch[1]);
            $("#searchform").submit();
        } else {
            $("#searchbar").val(interp);
            $("#searchform").submit();
        }
    } else {
        NativeBridge.setMessage("What?");
        NativeBridge.setGrammar(gSearchGrammarRootUrl, null, mainpage_searchGrammarHandler);
    }
}

function mainpage_listingGrammarHandler(result) {
    if (result != null && result.length > 0) {
        var interp = result[0].interpretation;
        var regexmatch = null;

        if ((regexmatch = interp.match(/^\d+$/)) != null) {
            var idx = regexmatch[0];
            globalSelectListing(idx);
            $.mobile.changePage("#detailspage");
        } else if ((regexmatch = interp.match(/^no,(.+)/i)) != null) {
            $("#searchbar").val(regexmatch[1]);
            $("#searchform").submit();
        } else if ((regexmatch = interp.match(/^connect,(\d+)/i)) != null) {
            var idx = regexmatch[1];
            $.getJSON(gListingServiceURI,
                        {
                            'reference': gListings[idx].reference
                        },
                        function (data) {
                            if (data && data.result && data.status == "OK") {
                                var item = data.result;
                                setTimeout('window.location="tel:' + item.formatted_phone_number + '";', 500);
                            }
                        });
        }
    } else {
        NativeBridge.setMessage("What?");
        NativeBridge.setGrammar(generateListingGrammarUrl(), null, mainpage_listingGrammarHandler);
    }
}

// Submit a Business search
function mainpage_BusinessSearch() {
    var query = $('#searchbar').val();
    $.mobile.showPageLoadingMsg();

    $.getJSON(gSearchServiceURI,
                {
                     'location': gLocation.latitude + ',' + gLocation.longitude
                    ,'query': query
                },
                function (data) {
                    $.mobile.hidePageLoadingMsg();
                    // empty meetings container
                    $('#meetings-container').empty();
                    // show back button
                    if (gCurrentMeeting) {
                        $('#list-back-btn').show();
                    }

                    if (data && data.results && data.status == "OK") {
                        gListings = data.results;
                        $('#results-container').empty();
                        $('<ul>').attr({ 'data-role': 'listview', 'data-inset': 'true', 'id': 'search-results' }).appendTo('#results-container');
                        $.each(gListings, function (i, item) {
                            var p1 = new LatLon(Geo.parseDMS(item.geometry.location.lat), Geo.parseDMS(item.geometry.location.lng));
                            var p2 = new LatLon(Geo.parseDMS(gLocation.latitude), Geo.parseDMS(gLocation.longitude));
                            $('<li>').attr({'data-icon':'custom-arrow-r'}).append(
                                $('<a>').attr({ 'href': '#detailspage', 'onclick': 'globalSelectListing(' + i + ');return false;'}).append(
                                    $('<img>').attr({'src':'images/transparent.gif',
                                                     'width':'1px',
                                                     'height':'1px',
                                                     'class':'ui-li-icon ui-corner-none list-location-marker'})).append(
                                    $('<span>').addClass('listing-name')
                                        .html(item.name + '<br />')).append(
                                    $('<span>').addClass('listing-address')
                                        .html(item.vicinity + '<br />')).append(
                                    $('<span>').addClass('listing-distance')
                                        .html('Approx. ' + (roundNumber(p1.distanceTo(p2)/1.609344, 2)) + ' miles'))).appendTo("#search-results");
                            if (i >= gBusinessSearchNumResults-1) {
                                return false;
                            }
                        });
                        $('#results-container').trigger('create');

                        if (gListings.length == 1) {
                            globalSelectListing(0);
                            $.mobile.changePage("#detailspage");
                        } else {
                            var msg = "Which location?";
                            NativeBridge.setMessage(msg);
                            NativeBridge.playTTS("female", "en-US", msg);
                            NativeBridge.setGrammar(generateListingGrammarUrl(), null, mainpage_listingGrammarHandler);
                        }
                    } else {
                        $('#results-container').empty();
                        $('<ul>').attr({ 'data-role': 'listview', 'data-inset': 'true', 'id': 'search-results' }).appendTo('#results-container');
                            $('<li>').attr({'style': 'text-align:center'}).append(
                                $('<span>').html("No results found.")).appendTo('#search-results');
                        $('#results-container').trigger('create');

                        var msg = "Say the name of a business.";
                        NativeBridge.setMessage(msg);
                        NativeBridge.playTTS("female", "en-US", msg);
                        NativeBridge.setGrammar(gSearchGrammarRootUrl, null, mainpage_searchGrammarHandler);
                    }
                });

    return false;
}

function generateListingGrammarUrl() {
    var url = gListingGrammarRootUrl;

    if (gListings != null) {
        for (var i = 0; i < gListings.length; i++) {
            var listing = gListings[i];
            var address = splitAddress(listing.vicinity);
            if (address.street && address.city) {
                url += ("&city." + i + "=" + encodeURIComponent(address.city));
                url += ("&address." + i + "=" + encodeURIComponent(address.street));
            }
        }
    }

    return url;
}

//-----------------------------------------------------------------------------

function detailspage_init() {
//    NativeBridge.setMessage(null);
//    NativeBridge.setGrammar(null, null, emptyGrammarHandler);
}

function detailspage_before_show() {
    //var msg = "What can I help you with?";
    //NativeBridge.setMessage(msg);
    //NativeBridge.playTTS("female", "en-US", msg);

    if (gSelectedListing.reference == "NONE") {
        update_details();
    } else {
        $.getJSON(gListingServiceURI,
                    {
                        'reference': gSelectedListing.reference
                    },
                    function (data) {
                        if (data && data.result && data.status == "OK") {
                            var item = data.result;
                            gSelectedListing.formatted_phone_number = item.formatted_phone_number ? item.formatted_phone_number : '';
                            gSelectedListing.website = cleanURL(item.website);
                            update_details();
                        }
                    });
    }

}

function update_details() {
    $('#details').empty();
    $('<ul>').attr({ 'data-role': 'listview', 'data-inset': 'true', 'id': 'details-listing' }).appendTo('#details');
    $('<li>').attr({ 'style': 'padding-top: 11px' }).append(
      $('<img>').attr({'src':'images/transparent.gif',
                       'width':'1px',
                       'height':'1px',
                       'class':'ui-li-icon ui-corner-none details-location-marker'})).append(
      $('<span>').addClass('details-name')
        .html(gSelectedListing.name)).append(
      $('<span>').addClass('details-url')
        .html(gSelectedListing.website ? "<br />" + gSelectedListing.website : '')).appendTo('#details-listing');
    $('<li>').append(
      $('<div>').addClass('ui-grid-a').append(
        $('<div>').addClass('ui-block-a').append(
          $('<span>').addClass('details-label')
            .html('ADDRESS:')),
        $('<div>').addClass('ui-block-b').append(
          $('<span>').addClass('details-address')
            .html(gSelectedListing.vicinity)))).appendTo('#details-listing');
    $('#details').trigger('create');
    $('#call').attr('href', 'tel:' + gSelectedListing.formatted_phone_number.replace(/[^0-9]/g, '')).trigger('create');
}

function detailspage_show() {
    NativeBridge.setMessage(null);
    NativeBridge.setGrammar(generateDetailsGrammarUrl(), null, detailspage_detailsGrammarHandler);

    var endLatlng = new google.maps.LatLng(gSelectedListing.geometry.location.lat, gSelectedListing.geometry.location.lng);
    var end = gSelectedListing.vicinity;
    var myOptions = {
      zoom: 16,
      center: endLatlng,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      zoomControl: false,
      streetViewControl: false
    };
    var map = new google.maps.Map(document.getElementById("map"), myOptions);

    var transparent = new google.maps.MarkerImage('images/transparent.gif',
         new google.maps.Size(1, 1));

    var marker = new google.maps.Marker({
        position: endLatlng,
        map: map,
        icon: transparent
    });

    var customMarker = new Marker({
      map: map
    }, 'details-map-marker');
    customMarker.bindTo('position', marker, 'position');

    function DirectionsControl(controlDiv, map) {
      var control = document.createElement('img');
      control.height = '1px';
      control.width= '1px';
      control.src = 'images/transparent.gif';
      control.className = "get-directions-btn";
      controlDiv.appendChild(control);

      google.maps.event.addDomListener(control, 'click', function() {
        $.mobile.changePage("#directionspage");
      });
    }

    function DepartureControl(controlDiv, map) {
      if (gSkin != '247') {
        var control = document.createElement('img');
        control.height = '1px';
        control.width= '1px';
        control.src = 'images/transparent.gif';
        control.className = "departure-alert-btn";
        controlDiv.appendChild(control);
      }
    }

    // Create the DIV to hold the controls
    var directionsControlDiv = document.createElement('div');
    var directionsControl = new DirectionsControl(directionsControlDiv, map);
    directionsControlDiv.index = 1;
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(directionsControlDiv);

    var departureControlDiv = document.createElement('div');
    var departureControl = new DepartureControl(departureControlDiv, map);
    departureControlDiv.index = 1;
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(departureControlDiv);

    $('#map').addClass('ui-corner-all').trigger('create');
}

function detailspage_detailsGrammarHandler(result) {
    if (result != null && result.length > 0) {
        var interp = result[0].interpretation;
        var regexmatch = null;
        if (interp == "connect") {
            setTimeout('window.location="' + $("#call").attr("href") + '";', 500);
            NativeBridge.setGrammar(generateDetailsGrammarUrl(), null, detailspage_detailsGrammarHandler);
        } else if (interp == "different") {
            history.back();
        } else if (interp == "directions") {
            $.mobile.changePage("#directionspage");
        } else if ((regexmatch = interp.match(/^\d+$/)) != null) {
            globalSelectListing(regexmatch[0]);
            $("#detailspage").trigger("pagebeforeshow");
            $("#detailspage").trigger("pageshow");
        } else if ((regexmatch = interp.match(/^no,(.+)/i)) != null) {
            gChangeSearchString = regexmatch[1];
            history.back();
        } else if ((regexmatch = interp.match(/^share,(\d+)/i)) != null) {
            var idx = regexmatch[1];
            if (idx < gShareList.length) {
                gShareList[idx].checked = true;
                $.mobile.changePage("#sharepage");
            }
        }
    } else {
        NativeBridge.setMessage("What?");
        NativeBridge.setGrammar(generateDetailsGrammarUrl(), null, detailspage_detailsGrammarHandler);
    }
}

function generateDetailsGrammarUrl() {
    var url = gDetailsGrammarRootUrl;

    if (gListings != null) {
        for (var i = 0; i < gListings.length; i++) {
            var listing = gListings[i];
            var address = splitAddress(listing.vicinity);
            if (address.street && address.city) {
                url += ("&city." + i + "=" + encodeURIComponent(address.city));
                url += ("&address." + i + "=" + encodeURIComponent(address.street));
            }
        }
    }

    for (var i = 0; i < gShareList.length; i++) {
        var p = gShareList[i];
        url += ("&name." + i + "=" + encodeURIComponent(p.name));
    }

    return url;
}

//-----------------------------------------------------------------------------

function directionspage_init() {
//    NativeBridge.setMessage(null);
//    NativeBridge.setGrammar(null, null, emptyGrammarHandler);
    if (gSkin == '247') {
        $('#departure-alert').empty();
    }
}

function directionspage_before_show() {
    $('#directions-details').empty();
    $('<ul>').attr({ 'data-role': 'listview', 'data-inset': 'true', 'id': 'directions-listing' }).appendTo('#directions-details');
    $('<li>').append(
      $('<span>').addClass('directions-name')
        .html(" " + gSelectedListing.name + "<br/>")).append(
      $('<span>').addClass('directions-url')
        .html(gSelectedListing.website ? gSelectedListing.website + '<br />' : '')).append(
      $('<span>').addClass('directions-address')
        .html(' ' + gSelectedListing.vicinity).prepend(
          $('<img>').attr({'src':'images/transparent.gif',
                           'width':'1px',
                           'height':'1px',
                           'class':'small-location-marker'}))).appendTo('#directions-listing');
    $('#directions-details').trigger('create');
    $('#call').attr('href', 'tel:' + gSelectedListing.formatted_phone_number.replace(/[^0-9]/g, '')).trigger('create');
}

function directionspage_show() {
    NativeBridge.setMessage(null);
    NativeBridge.setGrammar(generateDirectionsGrammarUrl(), null, directionspage_directionsGrammarHandler);

    $('#directions-panel').empty();
    var directionDisplay;
    var directionsService = new google.maps.DirectionsService();
    directionsDisplay = new google.maps.DirectionsRenderer({suppressMarkers: true});

    var endLatlng = new google.maps.LatLng(gSelectedListing.geometry.location.lat, gSelectedListing.geometry.location.lng);
    var end = gSelectedListing.vicinity;
    var myOptions = {
      zoom: 16,
      center: endLatlng,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      zoomControl: false,
      streetViewControl: false
    };
    var map = new google.maps.Map(document.getElementById("directions-map"), myOptions);

    directionsDisplay.setMap(map);
    directionsDisplay.setPanel(document.getElementById('directions-panel'));

    var startLatlng = new google.maps.LatLng(gLocation.latitude, gLocation.longitude);
    var request = {
        origin: startLatlng,
        destination: end,
        travelMode: google.maps.DirectionsTravelMode.DRIVING
    };

    var transparent = new google.maps.MarkerImage('images/transparent.gif',
         new google.maps.Size(1, 1));

    directionsService.route(request, function(response, status) {
        if (status == google.maps.DirectionsStatus.OK) {
            directionsDisplay.setDirections(response);
            var leg = response.routes[ 0 ].legs[ 0 ];
            var startMarker = new google.maps.Marker({position: leg.start_location, map: map, icon: transparent});
            var endMarker = new google.maps.Marker({position: leg.end_location,   map: map, icon: transparent});

            var startCustomMarker = new Marker({
              map: map
            }, 'directions-start-map-marker');
            startCustomMarker.bindTo('position', startMarker, 'position');

            var endCustomMarker = new Marker({
              map: map
            }, 'directions-end-map-marker');
            endCustomMarker.bindTo('position', endMarker, 'position');
        }
    });

    $('#directions-panel').addClass('ui-corner-bottom').trigger('create');
}

function directionspage_directionsGrammarHandler(result) {
    if (result != null && result.length > 0) {
        var interp = result[0].interpretation;
        var regexmatch = null;
        if (interp == "share") {
            $.mobile.changePage("#sharepage");
        } else if (interp == "alert") {
            // do nothing, just reset the grammar
            NativeBridge.setGrammar(generateDirectionsGrammarUrl(), null, directionspage_directionsGrammarHandler);
        } else if ((regexmatch = interp.match(/^share,(\d+)/i)) != null) {
            var idx = regexmatch[1];
            if (idx < gShareList.length) {
                gShareList[idx].checked = true;
                $.mobile.changePage("#sharepage");
            }
        }
    } else {
        NativeBridge.setMessage("What?");
        NativeBridge.setGrammar(generateDirectionsGrammarUrl(), null, directionspage_directionsGrammarHandler);
    }
}

function generateDirectionsGrammarUrl() {
    var url = gDirectionsGrammarRootUrl;

    for (var i = 0; i < gShareList.length; i++) {
        var p = gShareList[i];
        url += ("&name." + i + "=" + encodeURIComponent(p.name));
    }

    return url;
}

//-----------------------------------------------------------------------------

function sharepage_init() {
//    NativeBridge.setMessage(null);
//    NativeBridge.setGrammar(null, null, emptyGrammarHandler);
}

function sharepage_before_show() {
    if (gSelectedListing == null) {
        $('#info').html("No information");
        return;
    }

    $('#share-info').empty();
    $('<ul>').attr({ 'data-role': 'listview', 'data-inset': 'true', 'id': 'share-listing' }).appendTo('#share-info');
    $('<li>').append(
      $('<span>').addClass('share-name')
        .html(gSelectedListing.name + '<br />'),
      $('<span>').addClass('share-url')
        .html(gSelectedListing.website ? gSelectedListing.website + '<br />' : ''),
      $('<span>').addClass('share-address').html(' ' +
              gSelectedListing.vicinity).prepend(
        $('<img>').attr({'src':'images/transparent.gif',
                         'width':'1px',
                         'height':'1px',
                         'class':'address-pointer'}))).appendTo('#share-listing');

    if (gUseSuggested) {
        $('div.share-list-title').html('Suggested Attendees');
    } else {
        var time = getTimeHourString((new Date(gCurrentMeeting.startDate)));
        $('<li>').addClass('share-meeting-bg').append(
          $('<span>').addClass('share-meeting-name')
            .html(gCurrentMeeting.title)).append(
          $('<span>').addClass('share-meeting-time')
            .html(time)).appendTo('#share-listing');

        $('div.share-list-title').html('Meeting Attendees');
    }

    $('#share-info').trigger('create');

    //NativeBridge.setMessage("Who do you want to share with?");
    NativeBridge.setMessage(null);
    NativeBridge.setGrammar(generateShareGrammarUrl(), null, sharepage_shareGrammarHandler);

    //if (gCurrentMeeting == null) {
    //    alert("no meeting!");
    //    $('#address-select').empty();
    //    $('#address-select').html("No meeting");
    //    $('#address-select').trigger("create");
    //    return;
    //}

    $('#address-select').empty();
    $('<input />').attr({'id' : 'address_all', 'class' : 'custom', 'name' : 'address_all', 'type' : 'checkbox'}).appendTo('#address-select');
    $('#address_all').hide();
    $('<fieldset />').attr({ 'id': 'addresses', "data-role": "controlgroup" }).appendTo('#address-select');

    for (var i = 0; i < gShareList.length; i++) {
        var checked = gShareList[i].checked;
        var checkedClass = checked ? 'share-contact_name-selected' : 'share-contact_name';
        $('<input />').attr({ 'type': 'checkbox',
                              'checked' : checked,
                              'name': 'address',
                              'id': 'address' + i,
                              "class": "custom",
                              "data-iconpos" : "right"}).appendTo('#addresses');
        $('<label />').attr({ 'for': 'address' + i,
                              'id': 'address-label' + i,
                              'class': checkedClass}).text(gShareList[i].name).appendTo('#addresses');

        $('#address' + i).change(function () {
            var inputId = $(this).attr('id');
            var isChecked = $(this).is(":checked");
            var regexMatch = null;
            if ((regexMatch = inputId.match(/address(\d+)/)) != null) {
                var index = regexMatch[1];
                gShareList[index].checked = isChecked;
            }
            $("label[for='" + inputId + "']").toggleClass("share-contact_name-selected", isChecked);
            $("label[for='" + inputId + "']").toggleClass("share-contact_name", !isChecked);
        });
    }

    $('<a>').attr({ 'data-role' : 'button',
                    'onclick' : 'sharepage_addcontacts_click(); return false;',
                    'class' : 'share-add_other'}).append(
        $('<img>').attr({'src':'images/transparent.gif',
                 'width':'1px',
                 'height':'1px',
                 'class':'ui-li-icon ui-corner-none'})).appendTo('#addresses');

    $('#address-select').trigger('create');

    $("#address_all").change(function () {
        var isChecked = $(this).is(":checked");
        $("input[name=address]").attr("checked", isChecked).checkboxradio("refresh");
        $("input[name=address]").change();
    });
}

function sharepage_addcontacts_click() {
    $.mobile.showPageLoadingMsg();
    $.mobile.changePage('#addcontactdialog');
}

function sharepage_shareGrammarHandler(result) {
    if (result != null && result.length > 0) {
        var interp = result[0].interpretation;
        var regexmatch = null;
        if (interp == "sms") {
            $("#smsbutton").click();
        } else if (interp == "sms,*") {
            $("#address_all").attr("checked", true).checkboxradio("refresh");
            $("#address_all").change();
            $("#smsbutton").click();
        } else if (interp == "email") {
            $("#emailbutton").click();
        } else if (interp == "email,*") {
            $("#address_all").attr("checked", true).checkboxradio("refresh");
            $("#address_all").change();
            $("#emailbutton").click();
        } else if (interp == "*") {
            $("#address_all").attr("checked", true).checkboxradio("refresh");
            $("#address_all").change();
        } else if ((regexmatch = interp.match(/^\d+$/)) != null) {
            var idx = regexmatch[0];
            $("#address" + idx).attr("checked", true).checkboxradio("refresh");
            $("#address" + idx).change();
        } else if ((regexmatch = interp.match(/^email,(\d+)$/)) != null) {
            var idx = regexmatch[1];
            $("#address_all").attr("checked", false).checkboxradio("refresh");
            $("#address_all").change();
            $("input[name=address]").attr("checked", false).checkboxradio("refresh");
            $("#address" + idx).attr("checked", true).checkboxradio("refresh");
            $("#address" + idx).change();
            $("#emailbutton").click();
        } else if ((regexmatch = interp.match(/^sms,(\d+)$/)) != null) {
            var idx = regexmatch[1];
            $("#address_all").attr("checked", false).checkboxradio("refresh");
            $("#address_all").change();
            $("input[name=address]").attr("checked", false).checkboxradio("refresh");
            $("#address" + idx).attr("checked", true).checkboxradio("refresh");
            $("#address" + idx).change();
            $("#smsbutton").click();
        } else if (interp == "addother") {
            sharepage_addcontacts_click();
        }
        NativeBridge.setMessage(null);
    } else {
        NativeBridge.setMessage("What?");
    }

    NativeBridge.setGrammar(generateShareGrammarUrl(), null, sharepage_shareGrammarHandler);
}

function generateShareGrammarUrl() {
    var url = gShareGrammarRootUrl;

    for (var i = 0; i < gShareList.length; i++) {
        var p = gShareList[i];
        url += ("&name." + i + "=" + encodeURIComponent(p.name));
    }

    return url;
}

//-----------------------------------------------------------------------------

function addcontactdialog_addcontact(index) {
    if (index >= gContactList.length) {
        return;
    }

    var contact = gContactList[index];
    var name = getFullNameFromContact(contact);
    var email = getOneEmailFromContact(contact);
    var phone = getMobilePhoneFromContact(contact);

    addToGlobalShareList(
            {
                name : name,
                email : email,
                phone : phone,
                checked : true
            }
    );

    $.mobile.changePage("#sharepage");
}

function addcontactdialog_init() {
}

function addcontactdialog_before_show() {
    NativeBridge.setMessage(null);
    NativeBridge.setGrammar(gAddContactGrammars, null, addcontactdialog_contactGrammarHandler);
}

function addcontactdialog_show() {
    if (gContactList.length > 0 && $('li[name=contact]').length > 0) {
        // list has been populated, nothing to be done here
        $.mobile.hidePageLoadingMsg();
        return;
    }

    $('#buffer').empty();

    for (var i = 0; i < gContactList.length; i++) {
        var contact = gContactList[i];
        var name = getFullNameFromContact(contact);

        $('<li>').attr({'data-icon':'plus', 'name':'contact'}).append(
            $('<a>').attr({'onclick': 'addcontactdialog_addcontact(' + i + ');return false;'}).append(
                $('<img>').attr({'src':'images/transparent.gif',
                                 'width':'1px',
                                 'height':'1px',
                                 'class':'ui-li-icon ui-corner-none'})).append(
                $('<span>').attr('class', 'addcontact-name')
                    .html(name))).appendTo("#contacts");
    }

    $('#contacts').listview('refresh');

    $.mobile.hidePageLoadingMsg();
}

function addcontactdialog_contactGrammarHandler(result) {
    if (result != null && result.length > 0) {
        var interp = result[0].interpretation;
        var grammarIdx = result[0].name;
        var regexmatch = null;
        if ((regexmatch = interp.match(/^\d+$/)) != null) {
            var idx = (grammarIdx * gAddContactLimitPerGrammar) + parseInt(regexmatch[0]);
            addcontactdialog_addcontact(idx);
        }
        NativeBridge.setMessage(null);
    } else {
        NativeBridge.setMessage("What?");
        NativeBridge.setGrammar(gAddContactGrammars, null, addcontactdialog_contactGrammarHandler);
    }
}

function generateAddContactGrammarUrl() {
    var urls = [];
    var url = gAddContactGrammarRootUrl;

    var count = 0;
    for (var i = 0; i < gContactList.length; i++) {
        var p = gContactList[i];
        url += ("&n." + count + "=" + encodeURIComponent(getFullNameFromContact(p)));

        count++;
        if (count >= gAddContactLimitPerGrammar) {
            urls.push(url);
            url = gAddContactGrammarRootUrl;
            count = 0;
        }
    }

    if (count > 0) {
        urls.push(url);
    }

    return urls;
}

//-----------------------------------------------------------------------------

function sendSMS() {
    gRecipientList = [];
    $("input[name=address]:checked").each(
        function () {
            var id = $(this).attr("id");
            if ((regexmatch = id.match(/(\d+)$/)) != null) {
                var index = regexmatch[1];
                if (gShareList.length) {
                    var p = gShareList[index];
                    if (p != null && p.phone != '') {
                        gRecipientList.push(p.phone);
                    }
                }
            }
        }
    );

    var body  = gSelectedListing.name + ', ' +
                gSelectedListing.vicinity;

    if (gRecipientList.length) {
        NativeBridge.sendText(gRecipientList, body);
    } else {
        NativeBridge.sendText(null, body);
    }
}

function sendEmail() {
    gRecipientList = [];
    $("input[name=address]:checked").each(
        function () {
            var id = $(this).attr("id");
            if ((regexmatch = id.match(/(\d+)$/)) != null) {
                var index = regexmatch[1];
                if (gShareList.length) {
                    var p = gShareList[index];
                    if (p != null && p.email != '') {
                        gRecipientList.push(p.email);
                    }
                }
            }
        }
    );

    var body  = gSelectedListing.name + ', ' +
                gSelectedListing.vicinity;
    var subject = gUseSuggested ? gSelectedListing.name : gCurrentMeeting.title;
    if (gRecipientList.length) {
        NativeBridge.sendMail(gRecipientList, subject, body);
    } else {
        NativeBridge.sendMail(null, subject, body);
    }
}
