
function roundNumber(number, digits) {
    var multiple = Math.pow(10, digits);
    var rndedNum = Math.round(number * multiple) / multiple;
    return rndedNum;
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

function truncate(str, len) {
    var truncated = str;

    if (truncated != null && truncated.length) {
        var space = truncated.indexOf(' ');

        if (space > 0) {
            var sub = truncated.substring(space);

            var regex = /[^\w\s]/;
            var match = sub.match(regex);
            var end = match ? sub.indexOf(match) : sub.length;

            truncated = [truncated.substring(0, space), sub.substring(0, end)].join(" ").trim();

            // if still too long
            if (truncated.length >= len) {
                truncated = truncated.trim()
                                     .substring(0, len)
                                     .split(" ")
                                     .slice(0, -1)
                                     .join(" ");
            }
        }
    }
    return truncated;
}

function cleanURL(url) {
    var cleaned = '';
    if (url) {
        cleaned = url.replace("http://",'');
        if (cleaned.charAt(cleaned.length-1) == '/') {
            cleaned = cleaned.substring(0, cleaned.length-1);
        }
    }
    return cleaned;
}

function splitAddress(address) {
    var obj = {};

    if (address) {
        var s = address.split(',');
        if (2 == s.length) {
            obj.city = s.slice(s.length-1).join("").trim();
            obj.street = s.slice(0, s.length-1).join(" ").trim();
        } else if (s.length > 2) {
            obj.city = s.slice(s.length-1).join("").trim();
            obj.street = s.slice(1, s.length-1).join(" ").trim();
        }
    }

    return obj;
}

