(function() {
    // =======================
    // Configuration Variables
    // =======================
    var CONFIG = {
        domain: ".domain.com",                // Domain for cookie setting
        referrerToIgnore: "domain",           // Referrers to ignore (self-referrals)
        utmCookieName: "utm",                 // Name of the UTM cookie
        utmCookieExpiryDays: 30,              // UTM cookie expiration in days
        portalID: '1234567',                   // HubSpot Portal ID
        formID: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', // HubSpot Form ID
        calendarFormEndpoint: 'https://api.hsforms.com/submissions/v3/integration/submit/', // HubSpot Calendar API endpoint
        logEnabled: false                      // Toggle for console logging
    };

    // ==================
    // Utility Functions
    // ==================

    /**
     * Logs messages to the console if logging is enabled.
     * @param {...*} args - The messages or data to log.
     */
    function log() {
        if (CONFIG.logEnabled && window.console && console.log) {
            console.log.apply(console, arguments);
        }
    }

    /**
     * Sets a cookie with the specified name, value, and expiration days.
     * @param {string} name - The name of the cookie.
     * @param {string} value - The value of the cookie.
     * @param {number} days - The number of days until the cookie expires.
     */
    function setCookie(name, value, days) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        var cookieString = name + "=" + (encodeURIComponent(value) || "") + expires + "; path=/; domain=" + CONFIG.domain + "; SameSite=Lax; Secure";
        document.cookie = cookieString;
        log("Cookie set:", cookieString);
    }

    /**
     * Retrieves the value of a specified cookie.
     * @param {string} name - The name of the cookie to retrieve.
     * @returns {string|null} - The value of the cookie or null if not found.
     */
    function getCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i].trim();
            if (c.indexOf(nameEQ) === 0) {
                try {
                    var decodedValue = decodeURIComponent(c.substring(nameEQ.length, c.length));
                    log("Cookie retrieved:", name, "=", decodedValue);
                    return decodedValue;
                } catch (e) {
                    console.error("Error decoding cookie:", e);
                    return null;
                }
            }
        }
        return null;
    }

    /**
     * Deletes a specified cookie by setting its expiration date in the past.
     * @param {string} name - The name of the cookie to delete.
     */
    function deleteCookie(name) {
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + CONFIG.domain + "; SameSite=Lax; Secure";
        log("Cookie deleted:", name);
    }

    /**
     * Checks if a specific cookie exists.
     * @param {string} name - The name of the cookie to check.
     * @returns {boolean} - True if the cookie exists, false otherwise.
     */
    function checkCookie(name) {
        return getCookie(name) !== null;
    }

    // ========================
    // UTM Cookie Management
    // ========================

    /**
     * Sets the UTM cookie with the provided UTM parameters.
     * @param {Object} utmParams - An object containing UTM parameters.
     */
    function setUTMCookie(utmParams) {
        var utmValue = JSON.stringify(utmParams);
        setCookie(CONFIG.utmCookieName, utmValue, CONFIG.utmCookieExpiryDays);
    }

    /**
     * Retrieves and parses the UTM cookie.
     * @returns {Object|null} - The parsed UTM parameters or null if not found.
     */
    function getUTMCookie() {
        var utmCookie = getCookie(CONFIG.utmCookieName);
        if (utmCookie) {
            try {
                var utmParams = JSON.parse(utmCookie);
                log("UTM Params Retrieved:", utmParams);
                return utmParams;
            } catch (e) {
                console.error("Error parsing UTM cookie:", e);
                return null;
            }
        }
        return null;
    }

    /**
     * Clears the UTM cookie.
     */
    function clearUTMCookie() {
        deleteCookie(CONFIG.utmCookieName);
    }

    /**
     * Parses UTM parameters from the URL or referrer and sets the UTM cookie accordingly.
     */
    function parseUTMParams() {
        var currentURL = new URL(window.location.href);
        var params = currentURL.searchParams;

        // List of UTM and tracking parameters to check
        var utmParamKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];

        // Check if any UTM parameter is present in the URL
        var isUTMInURL = false;
        for (var i = 0; i < utmParamKeys.length; i++) {
            if (params.has(utmParamKeys[i])) {
                isUTMInURL = true;
                break;
            }
        }

        if (isUTMInURL) {
            var utmParams = {
                utm_source: params.get("utm_source") ? params.get("utm_source").toLowerCase() : "",
                utm_medium: params.get("utm_medium") ? params.get("utm_medium").toLowerCase() : "",
                utm_campaign: params.get("utm_campaign") ? params.get("utm_campaign").toLowerCase() : "",
                utm_term: params.get("utm_term") ? params.get("utm_term").toLowerCase() : "",
                utm_content: params.get("utm_content") ? params.get("utm_content").toLowerCase() : "",
                utm_gclid: params.get("gclid") ? params.get("gclid") : "",
                utm_fbclid: params.get("fbclid") ? params.get("fbclid") : ""
            };
            log("UTM parameters found in URL:", utmParams);
            setUTMCookie(utmParams);
        } else if (document.referrer) {
            var referrer;
            try {
                referrer = new URL(document.referrer).hostname;
            } catch (e) {
                console.error("Error parsing referrer URL:", e);
                return;
            }

            if (referrer.toLowerCase().indexOf(CONFIG.referrerToIgnore.toLowerCase()) !== -1) {
                log("Referrer is ignored:", referrer);
                return;
            }

            var hostnameParts = referrer.split(".");
            var referrerDomain;

            if (hostnameParts.length === 2) { // e.g., example.com
                referrerDomain = hostnameParts[0];
            } else if (hostnameParts.length === 3) { // e.g., sub.example.com
                referrerDomain = hostnameParts[1];
            } else {
                referrerDomain = "not-set";
            }

            if (referrerDomain !== "not-set") {
                var referrerUTMParams = {
                    utm_source: referrerDomain.toLowerCase(),
                    utm_medium: "helper_ref"
                };
                var existingUTM = getUTMCookie();
                if (existingUTM && existingUTM.utm_medium === "helper_ref") {
                    setUTMCookie(referrerUTMParams);
                } else if (!existingUTM) {
                    setUTMCookie(referrerUTMParams);
                }
                log("Referrer-based UTM parameters set:", referrerUTMParams);
            }
        }
    }

    // ===============================
    // HubSpot Forms Telemetry Integration
    // ===============================

    /**
     * Constructor function for handling HubSpot forms telemetry.
     */
    function hsFormsTelemetry() {
        this.init = function() {
            this.watchHubspotForms();
        };

        /**
         * Sets up event listeners for HubSpot form events.
         */
        this.watchHubspotForms = function() {
            var scope = this;
            window.addEventListener('message', function(event) {
                if (event.data.type === 'hsFormCallback') {
                    if (event.data.eventName === 'onFormReady') {
                        scope.processUTMCookies();
                    }
                    if (event.data.eventName === 'onFormSubmit') {
                        scope.handleFormSubmit(event.data.id);
                    }
                }
            });
        };

        /**
         * Processes UTM cookies and populates HubSpot form fields.
         */
        this.processUTMCookies = function() {
            var utmParams = getUTMCookie();

            if (utmParams) {
                try {
                    this.populateHSField("hs_utm_source", utmParams.utm_source);
                    this.populateHSField("hs_utm_medium", utmParams.utm_medium);
                    this.populateHSField("hs_utm_campaign", utmParams.utm_campaign);
                    this.populateHSField("hs_utm_term", utmParams.utm_term);
                    this.populateHSField("hs_utm_content", utmParams.utm_content);
                    this.populateHSField("hs_utm_gclid", utmParams.utm_gclid);
                    this.populateHSField("hs_utm_fbclid", utmParams.utm_fbclid);
                } catch (e) {
                    console.error("Could not parse UTM session:", e);
                }
            }
        };

        /**
         * Populates hidden fields in HubSpot forms with UTM parameters.
         * @param {string} fieldClass - The class name of the HubSpot form field.
         * @param {string} value - The value to set for the field.
         */
        this.populateHSField = function(fieldClass, value) {
            try {
                var fields = document.getElementsByClassName(fieldClass);
                for (var i = 0; i < fields.length; i++) {
                    var input = fields[i].getElementsByTagName("input")[0];
                    if (input) {
                        input.value = value || "not-set";
                        input.dispatchEvent(new Event("change"));
                        log("Populated", fieldClass, "with value:", value || "not-set");
                    }
                }
            } catch (e) {
                console.error("Could not process field:", fieldClass, e);
            }
        };

        /**
         * Handles form submission events by clearing the UTM cookie.
         * @param {string} formId - The ID of the submitted form.
         */
        this.handleFormSubmit = function(formId) {
            log("Form submitted:", formId);
            clearUTMCookie();
        };

        this.init();
    }

    // ==========================================
    // HubSpot Calendar Form Submissions Handling
    // ==========================================

    /**
     * Handles calendar form submissions by sending UTM data to HubSpot and clearing the UTM cookie.
     */
    function handleCalendarSubmission() {
        window.addEventListener('message', function(event) {
            if (event.data.meetingBookSucceeded) {
                var userEmail;
                try {
                    userEmail = event.data.meetingsPayload.bookingResponse.postResponse.contact.email;
                } catch (e) {
                    console.error("Error retrieving user email from calendar submission:", e);
                    return;
                }

                formv3(userEmail);
                clearUTMCookie();
            }
        });
    }

    /**
     * Sends UTM data along with the user's email to HubSpot via API.
     * @param {string} email - The user's email address.
     */
    function formv3(email) {
        var utmData = {};
        try {
            var utmCookie = getCookie(CONFIG.utmCookieName);
            if (utmCookie) {
                utmData = JSON.parse(utmCookie);
            }
        } catch (e) {
            console.error("Failed to parse UTM cookie:", e);
        }

        var utmMedium = utmData['utm_medium'] || '';
        var utmSource = utmData['utm_source'] || '';
        var utmCampaign = utmData['utm_campaign'] || '';
        var utmTerm = utmData['utm_term'] || '';
        var utmContent = utmData['utm_content'] || '';
        var utmGclid = utmData['utm_gclid'] || '';
        var utmFbclid = utmData['utm_fbclid'] || '';

        // Get current time
        var currentTime = Date.now();

        // Get the hubspotutk cookie value
        var hubspotutk = getCookie('hubspotutk') || "";

        var data = {
            "submittedAt": currentTime.toString(),
            "fields": [
                {
                    "objectTypeId": "0-1",
                    "name": "email",
                    "value": email
                }
            ],
            "context": {
                "hutk": hubspotutk,
                "pageUri": window.location.href
            }
        };

        addUTMField(data.fields, "utm_medium", utmMedium);
        addUTMField(data.fields, "utm_source", utmSource);
        addUTMField(data.fields, "utm_campaign", utmCampaign);
        addUTMField(data.fields, "utm_term", utmTerm);
        addUTMField(data.fields, "utm_content", utmContent);
        addUTMField(data.fields, "utm_gclid", utmGclid);
        addUTMField(data.fields, "utm_fbclid", utmFbclid);

        var url = CONFIG.calendarFormEndpoint + CONFIG.portalID + '/' + CONFIG.formID;
        var finalData = JSON.stringify(data);

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: finalData
        })
        .then(function(response) {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('API call failed with status ' + response.status);
            }
        })
        .then(function(responseData) {
            log("Calendar submission response:", JSON.stringify(responseData));
        })
        .catch(function(error) {
            console.error("Error submitting calendar form:", error.message);
        });
    }

    /**
     * Adds a UTM field to the fields array if the value is present.
     * @param {Array} fields - The array of fields to which the UTM field will be added.
     * @param {string} fieldName - The name of the UTM field.
     * @param {string} fieldValue - The value of the UTM field.
     */
    function addUTMField(fields, fieldName, fieldValue) {
        if (fieldValue) {
            fields.push({
                "objectTypeId": "0-1",
                "name": fieldName,
                "value": fieldValue
            });
            log("Added UTM field:", fieldName, "=", fieldValue);
        }
    }

    // ====================
    // Initialization Logic
    // ====================

    /**
     * The main function initializes parsing UTM parameters, sets up HubSpot forms telemetry, and handles calendar submissions.
     */
    function main() {
        parseUTMParams();
        new hsFormsTelemetry();
        handleCalendarSubmission();
    }

    // Execute the main function on script load
    main();

})();
