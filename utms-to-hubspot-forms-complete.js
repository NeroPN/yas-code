        // Variables
        var domain = ".yourdomain.com";
        var referrerToIgnore = "yourdomain";

        function setUTMCookie(utmParams) {
            console.log("SetUTMCookie ran");
            try {
                var date = new Date();
                date.setTime(date.getTime() + (30 * 24 * 60 * 60 * 1000)); // Set cookie for 30 days
                var expires = "; expires=" + date.toUTCString();

                var cookieString = "utm=" + encodeURIComponent(JSON.stringify(utmParams)) + 
                                   expires + "; domain=" + domain + "; path=/";
                console.log("UTM Cookie String:", cookieString);
                document.cookie = cookieString;

                // Verify if the cookie was set
                console.log("Document Cookie After UTM Set:", document.cookie);
            } catch (e) {
                console.error("Error setting UTM cookie:", e);
            }
        }

        function getUTMCookie() {
            var name = "utm=";
            var decodedCookie = decodeURIComponent(document.cookie);
            var ca = decodedCookie.split(';');
            for (var i = 0; i < ca.length; i++) {
                var c = ca[i].trim();
                if (c.indexOf(name) == 0) {
                    try {
                        return JSON.parse(c.substring(name.length, c.length));
                    } catch (e) {
                        console.error("Error parsing UTM cookie:", e);
                        return null;
                    }
                }
            }
            return null;
        }

        function parseUTMParams() {
            var currentURL = new URL(window.location.href);
            var params = currentURL.searchParams;

            var isUTMInURL = params.get("utm_source") || params.get("utm_medium") || 
                             params.get("utm_campaign") || params.get("utm_term") || 
                             params.get("utm_content") || params.get("gclid") || 
                             params.get("fbclid");

            if (isUTMInURL) {
                var utmParams = {
                    utm_source: params.get("utm_source") ? params.get("utm_source").toLowerCase() : "",
                    utm_medium: params.get("utm_medium") ? params.get("utm_medium").toLowerCase() : "",
                    utm_campaign: params.get("utm_campaign") ? params.get("utm_campaign").toLowerCase() : "",
                    utm_term: params.get("utm_term") ? params.get("utm_term").toLowerCase() : "",
                    utm_content: params.get("utm_content") ? params.get("utm_content").toLowerCase() : "",
                    utm_gclid: params.get("gclid") ? params.get("gclid").toLowerCase() : "",
                    utm_fbclid: params.get("fbclid") ? params.get("fbclid").toLowerCase() : "",
                };
                console.log("UTM Params:", utmParams);
                setUTMCookie(utmParams);
            } else if (document.referrer) {
                var referrer = new URL(document.referrer).hostname;
                if (referrer.toLowerCase().includes(referrerToIgnore)) {
                    return;
                }

                var hostnameParts = referrer.split(".");
                var referrerDomain;
                if (hostnameParts.length === 2) {
                    referrerDomain = hostnameParts[0];
                } else if (hostnameParts.length === 3) {
                    referrerDomain = hostnameParts[1];
                } else {
                    referrerDomain = "not-set";
                }

                if (referrerDomain !== "not-set") {
                    var referrerUTMParams = {
                        utm_source: referrerDomain.toLowerCase(),
                        utm_medium: "referral",
                    };
                    var existingUTM = getUTMCookie();
                    if (existingUTM && existingUTM.utm_medium === "referral") {
                        setUTMCookie(referrerUTMParams);
                    } else if (!existingUTM) {
                        setUTMCookie(referrerUTMParams);
                    }
                }
            }
        }

        parseUTMParams();

        function setConsentCookie() {
            var cookieName = "consent_given";
            var cookieValue = "true";
            var expiryDays = 365;
            var date = new Date();
            date.setTime(date.getTime() + (expiryDays * 24 * 60 * 60 * 1000));
            var expires = "expires=" + date.toUTCString();

            document.cookie = cookieName + "=" + cookieValue + ";" + expires + ";path=/";
            console.log("Consent Cookie Set:", document.cookie);
        }

        setConsentCookie();

        // HubSpot Forms Telemetry Integration
        function hsFormsTelemetry() {
            this.init = function () {
                this.watchHubspotForms();
            };

            this.watchHubspotForms = function () {
                var scope = this;
                window.addEventListener('message', function (event) {
                    if (event.data.type === 'hsFormCallback' && event.data.eventName === 'onFormReady') {
                        scope.processUTMParams();
                    }

                    if (event.data.type === 'hsFormCallback' && event.data.eventName === 'onFormSubmit') {
                        scope.trackHSFormSubmitted(event.data.id);
                    }
                });
            };

            this.processUTMParams = function () {
                var utmParams = this.getCookie("utm");

                if (utmParams) {
                    try {
                        utmParams = JSON.parse(decodeURIComponent(utmParams));

                        this.populateHSField(document.getElementsByClassName("hs_utm_source"), utmParams.utm_source);
                        this.populateHSField(document.getElementsByClassName("hs_utm_medium"), utmParams.utm_medium);
                        this.populateHSField(document.getElementsByClassName("hs_utm_campaign"), utmParams.utm_campaign);
                        this.populateHSField(document.getElementsByClassName("hs_utm_term"), utmParams.utm_term);
                        this.populateHSField(document.getElementsByClassName("hs_utm_content"), utmParams.utm_content);

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
            };

            this.init();
        }

        new hsFormsTelemetry();
 
