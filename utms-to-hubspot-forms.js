function setUTMCookie(utmParams) {
    // Create a cookie string from the UTM parameters object
    var cookieString = "utm=" + encodeURIComponent(JSON.stringify(utmParams)) + "; domain=.example.com; path=/";
    // Set the cookie in the browser
    document.cookie = cookieString;
}

function getUTMCookie() {
    var name = "utm=";
    // Decode the document's cookie string
    var decodedCookie = decodeURIComponent(document.cookie);
    // Split the cookies into an array
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        // Remove leading whitespace characters
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        // Check if this cookie starts with the UTM cookie name
        if (c.indexOf(name) == 0) {
            // Parse and return the UTM parameters object
            return JSON.parse(c.substring(name.length, c.length));
        }
    }
    return null;
}

function parseUTMParams() {
    // Get the current URL object
    var currentURL = new URL(window.location.href);
    // Get the search parameters from the URL
    var params = currentURL.searchParams;

    // Check if any UTM parameters or click IDs are present in the URL
    var isUTMInURL = params.get("utm_source") || params.get("utm_medium") || 
                     params.get("utm_campaign") || params.get("utm_term") || 
                     params.get("utm_content") || params.get("gclid") || 
                     params.get("fbclid");

    if (isUTMInURL) {
        // Create an object with the UTM parameters from the URL
        var utmParams = {
            utm_source: params.get("utm_source") ? params.get("utm_source").toLowerCase() : "",
            utm_medium: params.get("utm_medium") ? params.get("utm_medium").toLowerCase() : "",
            utm_campaign: params.get("utm_campaign") ? params.get("utm_campaign").toLowerCase() : "",
            utm_term: params.get("utm_term") ? params.get("utm_term").toLowerCase() : "",
            utm_content: params.get("utm_content") ? params.get("utm_content").toLowerCase() : "",
            utm_gclid: params.get("gclid") ? params.get("gclid").toLowerCase() : "",
            utm_fbclid: params.get("fbclid") ? params.get("fbclid").toLowerCase() : "",
        };
        // Set the UTM cookie with the parameters from the URL
        setUTMCookie(utmParams);
    } else if (document.referrer) {
        // Get the referrer URL object
        var referrer = new URL(document.referrer).hostname;
        // Ignore if the referrer is the current site
        if (referrer.toLowerCase().includes("example")) {
            return;
        }

        // Split the referrer hostname into parts
        var hostnameParts = referrer.split(".");
        var referrerDomain;
        // Extract the middle part of the referrer hostname
        if (hostnameParts.length === 2) {
            referrerDomain = hostnameParts[0];
        } else if (hostnameParts.length === 3) {
            referrerDomain = hostnameParts[1];
        } else {
            referrerDomain = "not-set";
        }

        if (referrerDomain !== "not-set") {
            // Create an object with the referrer UTM parameters
            var referrerUTMParams = {
                utm_source: referrerDomain.toLowerCase(),
                utm_medium: "referral",
            };
            // Get the existing UTM cookie if it exists
            var existingUTM = getUTMCookie();
            // Update the UTM cookie if necessary
            if (existingUTM && existingUTM.utm_medium === "referral") {
                setUTMCookie(referrerUTMParams);
            } else if (!existingUTM) {
                setUTMCookie(referrerUTMParams);
            }
        }
    }
}

// Execute the function to parse UTM parameters
parseUTMParams();

// HubSpot Forms Telemetry Integration
function hsFormsTelemetry() {
    this.init = function () {
        this.watchHubspotForms();
    };

    this.watchHubspotForms = function () {
        var scope = this;
        window.addEventListener('message', function (event) {
            // READY?
            if (event.data.type === 'hsFormCallback' && event.data.eventName === 'onFormReady') {
                scope.processUTMParams();
            }

            // SUBMITTED?
            if (event.data.type === 'hsFormCallback' && event.data.eventName === 'onFormSubmit') {
                scope.trackHSFormSubmitted(event.data.id);
            }
        });
    };

    this.processUTMParams = function () {
        // Get UTM values from the cookie
        var utmParams = this.getCookie("utm");

        // PROCESS UTM PARAMS
        if (utmParams) {
            try {
                utmParams = JSON.parse(utmParams);

                this.populateHSField(document.getElementsByClassName("hs_utm_source"), utmParams.utm_source);
                this.populateHSField(document.getElementsByClassName("hs_utm_medium"), utmParams.utm_medium);
                this.populateHSField(document.getElementsByClassName("hs_utm_campaign"), utmParams.utm_campaign);
                this.populateHSField(document.getElementsByClassName("hs_utm_term"), utmParams.utm_term);
                this.populateHSField(document.getElementsByClassName("hs_utm_content"), utmParams.utm_content);
                // this.populateHSField(document.getElementsByClassName("hs_utm_gclid"), utmParams.utm_gclid);

            } catch (e) {
                console.error("Could not parse UTM session:", e);
            }
        }
    };

    this.populateHSField = function (fields, value) {
        try {
            Array.prototype.forEach.call(fields, function (field) {
                var input = field.getElementsByTagName("input")[0];
                input.value = (value !== false) ? value : "not-set";
                input.dispatchEvent(new Event("change"));
            });
        } catch (e) {
            console.error("Could not process:", value, e);
        }
    };

    this.getCookie = function (name) {
        var value = document.cookie.match(new RegExp(name + '=([^;]+)'));
        value = value ? value[1] : null;

        return value;
    };

    this.trackHSFormSubmitted = function (formId) {
        // Implement your tracking logic for HubSpot form submissions here if wanted
    };

    // INIT TELEMETRY
    this.init();
}

// START
new hsFormsTelemetry();

