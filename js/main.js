// Bing API information
var gBingServiceURI = "http://api.bing.net/json.aspx";
var gBingAppID = "828426A1EC5F944259B11E6BF645E1F9744EE229";
var gBingSearchRadius = "25.0";
var gBingSearchNumResults = 10;

var gResourceRootUrl = "http://ec2-184-72-7-75.us-west-1.compute.amazonaws.com/";
var gGrammarRootUrl = gResourceRootUrl + "perl/mobilehost/grammars/dynamicgram.pl";
var gSearchGrammarRootUrl = gGrammarRootUrl + "?type=search";
var gListingGrammarRootUrl = gGrammarRootUrl + "?type=listing";
var gDetailsGrammarRootUrl = gGrammarRootUrl + "?type=details";
var gShareGrammarRootUrl = gGrammarRootUrl + "?type=share";
var gCurrentMeeting = null;
var gCurrentMeetingMaxParticipants = 15;

var gLocation = null;
var gChangeSearchString = null;
var gListings = [];
var gSelectedListing = null;

var gSharePrecheckIndex = null;

var gRecipientList = [];

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
    }
}

function globalSelectListing(index) {
    if (index >= 0 && gListings.length > index) {
        gSelectedListing = gListings[index];
    }
}

//-----------------------------------------------------------------------------
// Page specific functions, local scope
// DO NOT CALL THEM FROM OTHER PAGES
//-----------------------------------------------------------------------------
function mainpage_init() {
    NativeBridge.setMessage(null);
    NativeBridge.setGrammar(null, null, emptyGrammarHandler);

    var currentTime = (new Date()).getTime();
    //var currentTime = 1334923200000;
    var endTime = currentTime + 86400000;
    NativeBridge.getEvents(currentTime, endTime, mainpage_calendarHandler);

    NativeBridge.getLocation(globalLocationHandler);
}

function mainpage_show() {
    setTimeout("displayAd()", 2500);
}

function displayAd() {
    $('#ad').attr("class", "ad").trigger('create');
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
        gCurrentMeeting = null;
        for (var i = 0; i < result.length; i++) {
            var title = result[i].title;
            if (title.match(/^\(DEMO\).+/gi) != null) {
                gCurrentMeeting = result[i];
                $("#searchbar").val(gCurrentMeeting.location);
                var msg = "Are you looking for '" + gCurrentMeeting.location + "'?";
                NativeBridge.setMessage(msg);
                NativeBridge.playTTS("female", "en-US", msg);
                NativeBridge.setGrammar(gSearchGrammarRootUrl, null, mainpage_searchGrammarHandler);
                break;
            }
        }
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
                    if (data && data.SearchResponse && data.SearchResponse.Phonebook && data.SearchResponse.Phonebook.Results) {
                        gListings = data.SearchResponse.Phonebook.Results;
                        $('#results-container').empty();
                        $('<ul>').attr({ 'data-role': 'listview', 'data-inset': 'true', 'id': 'search-results' }).appendTo('#results-container');
                        $.each(gListings, function (i, item) {
                            var p1 = new LatLon(Geo.parseDMS(item.Latitude), Geo.parseDMS(item.Longitude));
                            var p2 = new LatLon(Geo.parseDMS(gLocation.latitude), Geo.parseDMS(gLocation.longitude));
                            $('<li>').append(
                                $('<a>').attr({ 'href': '#detailspage', 'onclick': 'globalSelectListing(' + i + ');return false;'}).append(
                                    $('<span>').attr('class', 'listing-name')
                                        .html(item.Title + '<br />').append(
                                        $('<span>').attr('class', 'listing-address')
                                            .html(item.Address + ', ' +
                                                  item.City + ', ' + 
                                                  item.StateOrProvince + ' ' +
                                                  item.PostalCode + '<br />').append(
                                            $('<span>').attr('class', 'listing-distance')
                                                .html((roundNumber(p1.distanceTo(p2)/1.609344, 2)) + ' miles'))))).appendTo("#search-results");
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
                            $('#ad').hide();
                        }
                    } else {
                        $('#results-container').empty();
                        $('<p>').attr({'align' : 'center'}).html("No result found").appendTo('#results-container');
                        $('#results-container').trigger('create');

                        var msg = "What are you looking for?";
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
    NativeBridge.setMessage(null);
    NativeBridge.setGrammar(null, null, emptyGrammarHandler);
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
      $('<span>').attr('class', 'details-name')
        .html(gSelectedListing.Title)).appendTo('#details-listing');
    $('<li>').append(
      $('<div>').attr('class', 'ui-grid-a').append(
        $('<div>').attr('class', 'ui-block-a').append(
          $('<span>').attr('class', 'details-label')
            .html('ADDRESS:')),
        $('<div>').attr('class', 'ui-block-b').append(
          $('<span>').attr('class', 'details-address')
            .html(gSelectedListing.Address + '<br />' +
                  gSelectedListing.City + ', ' +
                  gSelectedListing.StateOrProvince)))).appendTo('#details-listing');
    $('#details').trigger('create');
    $('#call').attr('href', 'tel:' + gSelectedListing.PhoneNumber.replace(/[^0-9]/g, '')).trigger('create');
}

function detailspage_show() {
    NativeBridge.setMessage(null);
    NativeBridge.setGrammar(generateDetailsGrammarUrl(), null, detailspage_detailsGrammarHandler);

    $('#directions-panel').empty();
    var directionDisplay;
    var directionsService = new google.maps.DirectionsService();
    directionsDisplay = new google.maps.DirectionsRenderer();

    var endLatlng = new google.maps.LatLng(gSelectedListing.Latitude, gSelectedListing.Longitude);
    var end = gSelectedListing.Address + ',' +
              gSelectedListing.City + ',' +
              gSelectedListing.StateOrProvince;
    var myOptions = {
      zoom: 16,
      center: endLatlng,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    var map = new google.maps.Map(document.getElementById("map"), myOptions);
    
    directionsDisplay.setMap(map);
    directionsDisplay.setPanel(document.getElementById('directions-panel'));

    //var marker = new google.maps.Marker({
    //    position: endLatlng, 
    //    map: map
    //});   

    var startLatlng = new google.maps.LatLng(gLocation.latitude, gLocation.longitude);
    var request = {
        origin: startLatlng,
        destination: end,
        travelMode: google.maps.DirectionsTravelMode.DRIVING
    };
    directionsService.route(request, function(response, status) {
        if (status == google.maps.DirectionsStatus.OK) {
            directionsDisplay.setDirections(response);
        }
    });
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

function sharepage_init() {
    NativeBridge.setMessage(null);
    NativeBridge.setGrammar(null, null, emptyGrammarHandler);
}

function sharepage_before_show() {
    //NativeBridge.setMessage("Who do you want to share with?");
    NativeBridge.setMessage(null);
    NativeBridge.setGrammar(generateShareGrammarUrl(), null, sharepage_shareGrammarHandler);

    if (gSelectedListing == null) {
        $('#info').html("No information");
        return;
    }

    $('#share-info').empty();
    $('<ul>').attr({ 'data-role': 'listview', 'data-inset': 'true', 'id': 'share-listing' }).appendTo('#share-info');
    $('<li>').append(
      $('<span>').attr('class', 'share-name')
        .html(gSelectedListing.Title + '<br />'),
      $('<span>').attr('class', 'share-address').html(' ' +
              gSelectedListing.Address + ', ' +
              gSelectedListing.City + ', ' +
              gSelectedListing.StateOrProvince).prepend(
        $('<img>').attr({'src':'images/transparent.gif',
                         'width':'1px',
                         'height':'1px',
                         'class':'address-pointer'}))).appendTo('#share-listing');
    $('#share-info').trigger('create');

    if (gCurrentMeeting == null) {
        alert("no meeting!");
        $('#address-select').empty();
        $('#address-select').html("No meeting");
        $('#address-select').trigger("create");
        return;
    }

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
        $('<input />').attr({ 'type': 'checkbox',
                              'checked' : checked, 
                              'name': 'address', 
                              'id': 'address' + i, 
                              "class": "custom",
                              "data-iconpos" : "right"}).appendTo('#addresses');
        $('<label />').attr({ 'for': 'address' + i,
                              'class': 'share-contact_name'}).text(participants[i].name).appendTo('#addresses');
    }
    $('<input />').attr({ 'type': 'checkbox',
                          'data-icon' : 'plus',
                          'id' : 'add_other',
                          "class": "custom",
                          "data-iconpos" : "right"}).appendTo('#addresses');
    $('<label />').attr({ 'for': 'add_other',
                          'class': 'share-add_other'}).text('Add Other Contacts').appendTo('#addresses');
    gSharePrecheckIndex = null;
    $('#address-select').trigger('create');

    $("#address_all").change(function () {
        var checked_status = this.checked;
        $("input[name=address]").attr("checked", checked_status).checkboxradio("refresh");
    });
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
    var subject = gCurrentMeeting.title;
    if (gRecipientList.length) {
      NativeBridge.sendMail(gRecipientList, subject, body);
    } else {
      NativeBridge.sendMail(null, subject, body);
    }
}
