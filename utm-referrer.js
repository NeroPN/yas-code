function setUTMCookieAndLocalStorage(utmParams) {
    // Replace '.yourdomain.com' with your actual domain
    var domain = '.yourdomain.com';

    var expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 7);

    var utmCookie = [
        'utm=', '=', JSON.stringify(utmParams),
        ';domain=' + domain,
        ';expires=' + expireDate.toUTCString(),
        ';path=/;'
    ].join('');

    document.cookie = utmCookie;

    // Store in local storage (as an alternative to cookies)
    localStorage.setItem('utm', JSON.stringify(utmParams));
}

function parseUTMParams() {
    var currentURL = new URL(window.location.href);
    var params = currentURL.searchParams;

    if (
        params.get("utm_source") ||
        params.get("utm_medium") ||
        params.get("utm_campaign") ||
        params.get("utm_term") ||
        params.get("utm_content") ||
        params.get("gclid") ||
        params.get("fbclid")
    ) {
        var utmParams = {
            utm_source: params.get("utm_source") ? params.get("utm_source").toLowerCase() : "",
            utm_medium: params.get("utm_medium") ? params.get("utm_medium").toLowerCase() : "",
            utm_campaign: params.get("utm_campaign") ? params.get("utm_campaign").toLowerCase() : "",
            utm_term: params.get("utm_term") ? params.get("utm_term").toLowerCase() : "",
            utm_content: params.get("utm_content") ? params.get("utm_content").toLowerCase() : "",
            utm_gclid: params.get("gclid") ? params.get("gclid").toLowerCase() : "",
        };

        setUTMCookieAndLocalStorage(utmParams);
        
    } else if (document.referrer && !checkCookie("utm")) {
        var referrerVariable = document.referrer;
        var hostnameParts = new URL(referrerVariable).hostname.split(".");
        var referrerDomain;

        if (hostnameParts.length === 2) {
            referrerDomain = hostnameParts[0];
        } else if (hostnameParts.length === 3) {
            referrerDomain = hostnameParts[1];
        } else {
            referrerDomain = "not-set";
        }

        if (referrerDomain !== "not-set") {
            var utmParams = {
                utm_source: referrerDomain.toLowerCase(),
                utm_medium: "helper_ref",
            };

            setUTMCookieAndLocalStorage(utmParams);
        }
    }
}

// Start
parseUTMParams();
