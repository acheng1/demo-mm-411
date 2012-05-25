var gSkin = '247';
//var gSkin = 'att';

// Bing API information
var gBingServiceURI = "http://api.bing.net/json.aspx";
var gBingAppID = "828426A1EC5F944259B11E6BF645E1F9744EE229";
var gBingSearchRadius = "25.0";
var gBingSearchNumResults = 10;

var gResourceRootUrl = "http://ec2-184-72-7-75.us-west-1.compute.amazonaws.com/";
var gGrammarRootUrl = gResourceRootUrl + "perl/demo-411-tmp/grammars/dynamicgram.pl";
var gSearchGrammarRootUrl = gGrammarRootUrl + "?type=search";
var gListingGrammarRootUrl = gGrammarRootUrl + "?type=listing";
var gDetailsGrammarRootUrl = gGrammarRootUrl + "?type=details";
var gDirectionsGrammarRootUrl = gGrammarRootUrl + "?type=directions";
var gShareGrammarRootUrl = gGrammarRootUrl + "?type=share";
var gCurrentMeeting = null;
var gUseSuggested = false;
var gCurrentMeetingMaxParticipants = 15;

var gLocation = null;
var gChangeSearchString = null;
var gListings = [];
var gSelectedListing = null;

var gSharePrecheckIndex = null;

var gRecipientList = [];

var gContactList = [];
var gMeetingList = [];
var gMeetingMaxCount = 5;
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

function getTimeHourString(date) {
    var h = date.getHours();
    var m = date.getMinutes();

    var hd = h % 12;
    hd = (hd == 0) ? 12 : hd;
    var md = (m < 10) ? '0' + m : m;
    var s = (h < 12) ? 'am' : 'pm';

    return hd + ((md == '00') ? '' : (':' + md)) + s;
}

function getTimeRemaining(date) {
    var now = new Date();
    var diff = new Date();
    diff.setTime(date.getTime() - now.getTime());
    var m = Math.ceil(diff.getTime()/60000);
    return m > 0 ? m : 0;
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

function truncate(str, len) {
    var truncated = str;
    if (str != null && str.length && str.indexOf(' ') > 0) {
        truncated = $.trim(str)
                     .substring(0, len)
                     .split(" ")
                     .slice(0, -1)
                     .join(" ");
        if (truncated.indexOf('(') > 5) {
            truncated = truncated.split('(').slice(0, 1);
        }
    }
    return truncated;
}

//-----------------------------------------------------------------------------

$(document).bind("mobileinit",
    function() {
        $.mobile.defaultPageTransition = "none";
    }
);

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
        gContactList = result;
        gContactList.sort(function(a,b) {
            var n1 = a.First + (a.Middle ? ' ' + a.Middle : '') + (a.Last ? ' ' + a.Last : '');
            var n2 = b.First + (b.Middle ? ' ' + b.Middle : '') + (b.Last ? ' ' + b.Last : '');
            if (n1 < n2) {
                return -1;
            } else if (n1 > n2) {
                return 1;
            }
            return 0;
        });
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
        }
    } else {
        //var msg = "Which location?";
        //NativeBridge.setMessage(msg);
        //NativeBridge.playTTS("female", "en-US", msg);
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
            m.location = truncate(m.location, 30);

            if (gCurrentMeeting == null) {
                gCurrentMeeting = m;
                $("#searchbar").val(gCurrentMeeting.location);
                var msg = "Are you looking for '" + gCurrentMeeting.location + "'?";
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
                    $('<span>').attr({'class' : 'meeting-time', 'style' : 'color:red'})
                        .html(remainingContent))).appendTo("#meetings");
        }

        $('#meetings-container').trigger('create');
    }
}

function mainpage_selectMeeting(index) {
    if (index >= 0 && gMeetingList.length > index) {
       gCurrentMeeting = gMeetingList[index];
       $("#searchbar").val(gCurrentMeeting.location);
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
            setTimeout('window.location="tel:' + gListings[idx].PhoneNumber+ '";', 500);
        }
    } else {
        NativeBridge.setMessage("What?");
        NativeBridge.setGrammar(generateListingGrammarUrl(), null, mainpage_listingGrammarHandler);
    }
}

// Submit a Bing search
function mainpage_BingSearch() {
    var query = $('#searchbar').val();
    $.mobile.showPageLoadingMsg();

    $.getJSON(gBingServiceURI + "?JsonCallback=?",
                {
                    'AppId': gBingAppID,
                    'Query': query,
                    'Sources': 'Phonebook',
                    'Version': '2.0',
                    'Market': 'en-us',
                    'UILanguage': 'en',
                    'Latitude': gLocation.latitude,
                    'Longitude': gLocation.longitude,
                    'Radius': gBingSearchRadius,
                    'Options': 'EnableHighlighting',
                    'Phonebook.Count': gBingSearchNumResults,
                    'Phonebook.Offset': 0,
                    'Phonebook.FileType': 'YP',
                    'Phonebook.SortBy': 'Distance',
                    'JsonType': 'callback'
                },
                function (data) {
                    $.mobile.hidePageLoadingMsg();
                    // empty meetings container
                    $('#meetings-container').empty();
                    // show back button
                    if (gCurrentMeeting) {
                        $('#list-back-btn').show();
                    }

                    if (data && data.SearchResponse && data.SearchResponse.Phonebook && data.SearchResponse.Phonebook.Results) {
                        gListings = data.SearchResponse.Phonebook.Results;
                        $('#results-container').empty();
                        $('<ul>').attr({ 'data-role': 'listview', 'data-inset': 'true', 'id': 'search-results' }).appendTo('#results-container');
                        $.each(gListings, function (i, item) {
                            var p1 = new LatLon(Geo.parseDMS(item.Latitude), Geo.parseDMS(item.Longitude));
                            var p2 = new LatLon(Geo.parseDMS(gLocation.latitude), Geo.parseDMS(gLocation.longitude));
                            $('<li>').attr({'data-icon':'custom-arrow-r'}).append(
                                $('<a>').attr({ 'href': '#detailspage', 'onclick': 'globalSelectListing(' + i + ');return false;'}).append(
                                    $('<img>').attr({'src':'images/transparent.gif',
                                                     'width':'1px',
                                                     'height':'1px',
                                                     'class':'ui-li-icon ui-corner-none list-location-marker'})).append(
                                    $('<span>').addClass('listing-name')
                                        .html(item.Title + '<br />')).append(
                                    $('<span>').addClass('listing-address')
                                        .html(item.Address + ', ' +
                                              item.City + ', ' +
                                              item.StateOrProvince + ' ' +
                                              item.PostalCode + '<br />')).append(
                                    $('<span>').addClass('listing-distance')
                                        .html('Approx. ' + (roundNumber(p1.distanceTo(p2)/1.609344, 2)) + ' miles'))).appendTo("#search-results");
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
            url += ("&city." + i + "=" + encodeURIComponent(listing.City));
            url += ("&address." + i + "=" + encodeURIComponent(listing.Address));
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

    //var address = gSelectedListing.Address + ', ' + gSelectedListing.City + ', ' + gSelectedListing.StateOrProvince + ' ' + gSelectedListing.PostalCode;
    //var mapKey = 'AqjFRf87m4pQCIGoMVGrIYHvhAuEhIIsTg45OQBhPArmxXM8nSllp6CZrEuKo9t-';
    //var mapURL = 'http://dev.virtualearth.net/REST/V1/Imagery/Map/Road/' +
    //    encodeURIComponent(address) +
    //    '?mapSize=192,221&mapLayer=TrafficFlow&key=' + mapKey;
    //var mapURL = 'http://maps.googleapis.com/maps/api/staticmap?' +
    //    'zoom=16' + '&' +
    //    'size=290x300' + '&' +
    //    'maptype=roadmap' + '&' +
    //    'markers=' + encodeURIComponent('size:mid|color:red|' + gSelectedListing.Latitude + ',' + gSelectedListing.Longitude) + '&' +
    //    'sensor=false';
    $('#details').empty();
    $('<ul>').attr({ 'data-role': 'listview', 'data-inset': 'true', 'id': 'details-listing' }).appendTo('#details');
    $('<li>').append(
      $('<span>').addClass('details-name')
        .html(" " + gSelectedListing.Title).prepend(
        $('<img>').attr({'src':'images/transparent.gif',
                         'width':'1px',
                         'height':'1px',
                         'class':'details-location-marker'}))).appendTo('#details-listing');
    $('<li>').append(
      $('<div>').addClass('ui-grid-a').append(
        $('<div>').addClass('ui-block-a').append(
          $('<span>').addClass('details-label')
            .html('ADDRESS:')),
        $('<div>').addClass('ui-block-b').append(
          $('<span>').addClass('details-address')
            .html(gSelectedListing.Address + '<br />' +
                  gSelectedListing.City + ', ' +
                  gSelectedListing.StateOrProvince)))).appendTo('#details-listing');
    $('#details').trigger('create');
    $('#call').attr('href', 'tel:' + gSelectedListing.PhoneNumber.replace(/[^0-9]/g, '')).trigger('create');
}

function detailspage_show() {
    NativeBridge.setMessage(null);
    NativeBridge.setGrammar(generateDetailsGrammarUrl(), null, detailspage_detailsGrammarHandler);

    var endLatlng = new google.maps.LatLng(gSelectedListing.Latitude, gSelectedListing.Longitude);
    var end = gSelectedListing.Address + ',' +
              gSelectedListing.City + ',' +
              gSelectedListing.StateOrProvince;
    var myOptions = {
      zoom: 16,
      center: endLatlng,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      zoomControl: false,
      streetViewControl: false
    };
    var map = new google.maps.Map(document.getElementById("map"), myOptions);

    var transparent = new google.maps.MarkerImage('images/transparent.png',
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
        } else if ((regexmatch = interp.match(/^no,(.+)/i)) != null) {
            gChangeSearchString = regexmatch[1];
            history.back();
        } else if ((regexmatch = interp.match(/^share,(\d+)/i)) != null) {
            var idx = regexmatch[1];
            var participants = gCurrentMeeting.participants;
            if (idx < participants.length && idx < gCurrentMeetingMaxParticipants) {
                gSharePrecheckIndex = idx;
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
            url += ("&city." + i + "=" + encodeURIComponent(listing.City));
            url += ("&address." + i + "=" + encodeURIComponent(listing.Address));
        }
    }

    if (gCurrentMeeting != null) {
        var participants = gCurrentMeeting.participants;
        var count = participants.length > gCurrentMeetingMaxParticipants ? gCurrentMeetingMaxParticipants : participants.length;
        for (var i = 0; i < count; i++) {
            var p = participants[i];
            url += ("&name." + i + "=" + encodeURIComponent(p.name));
        }
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
        .html(" " + gSelectedListing.Title + "<br/>"))
      .append(
      $('<span>').addClass('directions-address')
        .html(' ' + gSelectedListing.Address +
                  gSelectedListing.City + ', ' +
                  gSelectedListing.StateOrProvince).prepend(
          $('<img>').attr({'src':'images/transparent.gif',
                           'width':'1px',
                           'height':'1px',
                           'class':'small-location-marker'}))).appendTo('#directions-listing');
    $('#directions-details').trigger('create');
    $('#call').attr('href', 'tel:' + gSelectedListing.PhoneNumber.replace(/[^0-9]/g, '')).trigger('create');
}

function directionspage_show() {
    NativeBridge.setMessage(null);
    NativeBridge.setGrammar(gDirectionsGrammarRootUrl, null, directionspage_directionsGrammarHandler);

    $('#directions-panel').empty();
    var directionDisplay;
    var directionsService = new google.maps.DirectionsService();
    directionsDisplay = new google.maps.DirectionsRenderer({suppressMarkers: true});

    var endLatlng = new google.maps.LatLng(gSelectedListing.Latitude, gSelectedListing.Longitude);
    var end = gSelectedListing.Address + ',' +
              gSelectedListing.City + ',' +
              gSelectedListing.StateOrProvince;
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

    var transparent = new google.maps.MarkerImage('images/transparent.png',
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
        if (interp == "share") {
            $.mobile.changePage("#sharepage");
        }
    } else {
        NativeBridge.setMessage("What?");
        NativeBridge.setGrammar(gDirectionsGrammarRootUrl, null, directionspage_directionsGrammarHandler);
    }
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
        .html(gSelectedListing.Title + '<br />'),
      $('<span>').addClass('share-address').html(' ' +
              gSelectedListing.Address + ', ' +
              gSelectedListing.City + ', ' +
              gSelectedListing.StateOrProvince).prepend(
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

    var participants = gCurrentMeeting.participants != null ? gCurrentMeeting.participants : [];
    var count = participants.length;
    if (count > gCurrentMeetingMaxParticipants) {
        count = gCurrentMeetingMaxParticipants;
    }
    for (var i = 0; i < count; i++) {
        var checked = (gSharePrecheckIndex && gSharePrecheckIndex == i) ? true : false;
        var checkedClass = checked ? 'share-contact_name-selected' : 'share-contact_name';
        $('<input />').attr({ 'type': 'checkbox',
                              'checked' : checked,
                              'name': 'address',
                              'id': 'address' + i,
                              "class": "custom",
                              "data-iconpos" : "right"}).appendTo('#addresses');
        $('<label />').attr({ 'for': 'address' + i,
                              'id': 'address-label' + i,
                              'class': checkedClass}).text(participants[i].name).appendTo('#addresses');

        $('#address' + i).change(function () {
             var inputId = $(this).attr('id');
             var isChecked = $(this).is(":checked");
             $("label[for='" + inputId + "']").toggleClass("share-contact_name-selected", isChecked);
             $("label[for='" + inputId + "']").toggleClass("share-contact_name", !isChecked);
        });
    }
    //$('<input />').attr({ 'type': 'checkbox',
    //                      'data-icon' : 'plus',
    //                      'id' : 'add_other',
    //                      "class": "custom",
    //                      "data-iconpos" : "right"}).appendTo('#addresses');
    //$('<label />').attr({ 'for': 'add_other',
    //                      'class': 'share-add_other'}).text('Add Other Contacts').appendTo('#addresses');
    $('<a>').attr({ 'data-role' : 'button',
                    'onclick' : 'sharepage_addcontacts_click(); return false;',
                    'class' : 'share-add_other'}).append(
        $('<img>').attr({'src':'images/transparent.gif',
                 'width':'1px',
                 'height':'1px',
                 'class':'ui-li-icon ui-corner-none'})).appendTo('#addresses');

    gSharePrecheckIndex = null;
    $('#address-select').trigger('create');

    $("#address_all").change(function () {
        $("input[name=address]").attr("checked", $(this).is(":checked")).checkboxradio("refresh");
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
        } else if ((regexmatch = interp.match(/^email,(\d+)$/)) != null) {
            var idx = regexmatch[1];
            $("#address_all").attr("checked", false).checkboxradio("refresh");
            $("input[name=address]").attr("checked", false).checkboxradio("refresh");
            $("#address" + idx).attr("checked", true).checkboxradio("refresh");
            $("#emailbutton").click();
        } else if ((regexmatch = interp.match(/^sms,(\d+)$/)) != null) {
            var idx = regexmatch[1];
            $("#address_all").attr("checked", false).checkboxradio("refresh");
            $("input[name=address]").attr("checked", false).checkboxradio("refresh");
            $("#address" + idx).attr("checked", true).checkboxradio("refresh");
            $("#smsbutton").click();
        }
        NativeBridge.setMessage(null);
    } else {
        NativeBridge.setMessage("What?");
    }

    NativeBridge.setGrammar(generateShareGrammarUrl(), null, sharepage_shareGrammarHandler);
}

function generateShareGrammarUrl() {
    var url = gShareGrammarRootUrl;

    if (gCurrentMeeting != null) {
        var participants = gCurrentMeeting.participants;
        var count = participants.length > gCurrentMeetingMaxParticipants ? gCurrentMeetingMaxParticipants : participants.length;
        for (var i = 0; i < count; i++) {
            var p = participants[i];
            url += ("&name." + i + "=" + encodeURIComponent(p.name));
        }
    }

    return url;
}

//-----------------------------------------------------------------------------

function addcontactdialog_addcontact(index) {
    alert("TODO: add " + gContactList[index].First);
    $.mobile.changePage("#sharepage");
}

function addcontactdialog_init() {
}

function addcontactdialog_before_show() {
    NativeBridge.setMessage(null);
    NativeBridge.setGrammar(null, null, emptyGrammarHandler);

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
        var name = contact.First + (contact.Middle ? ' ' + contact.Middle : '') + (contact.Last ? ' ' + contact.Last : '');

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

//-----------------------------------------------------------------------------

function sendSMS() {
    var body  = gSelectedListing.Title + ', ' +
                gSelectedListing.Address + ', ' +
                gSelectedListing.City + ', ' +
                gSelectedListing.StateOrProvince;
    NativeBridge.sendText(null, body);
}

function sendEmail() {
    gRecipientList = [];
    $("input[name=address]:checked").each(
        function () {
          var id = $(this).attr("id");
          if ((regexmatch = id.match(/(\d+)$/)) != null) {
            var index = regexmatch[1];
            if (gCurrentMeeting != null) {
              var participants = gCurrentMeeting.participants;
              if (participants.length && participants[index] != null) {
                var email = participants[index].url.replace("mailto:","");
                gRecipientList.push(email);
              }
            }
          }
        }
    );

    var body  = gSelectedListing.Title + ', ' +
                gSelectedListing.Address + ', ' +
                gSelectedListing.City + ', ' +
                gSelectedListing.StateOrProvince;
    var subject = gUseSuggested ? gSelectedListing.Title : gCurrentMeeting.title;
    if (gRecipientList.length) {
      NativeBridge.sendMail(gRecipientList, subject, body);
    } else {
      NativeBridge.sendMail(null, subject, body);
    }
}
