(function() {
    console.log("UTM and HubSpot Prefill Script Loaded"); // Immediate log

    // =======================
    // Configuration Variables
    // =======================
    var CONFIG = {
        domain: ".domain.com",                  // Domain for cookie setting
        referrerToIgnore: "domain",            // Referrer substring to ignore
        utmCookieName: "utm",                   // Name of the UTM cookie
        utmCookieExpiryDays: 30,                // UTM cookie expiration in days
        portalID: '123456789',                   // HubSpot Portal ID
        formID: '123456789',                    // HubSpot Form ID
        calendarFormEndpoint: 'https://api.hsforms.com/submissions/v3/integration/submit/',
        logEnabled: true                        // Toggle for console logging
    };

    // ==================
    // Utility Functions
    // ==================

    /**
     * Logs messages to the console if logging is enabled.
     */
    function log() {
        if (CONFIG.logEnabled && window.console && console.log) {
            console.log.apply(console, arguments);
        }
    }

    /**
     * Sets a cookie with the specified name, value, and expiration days.
     */
    function setCookie(name, value, days) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        var cookieString = name + "=" + encodeURIComponent(value || "") + expires +
                           "; path=/; domain=" + CONFIG.domain + "; SameSite=Lax; Secure";
        document.cookie = cookieString;
        log("Cookie set:", cookieString);
    }

    /**
     * Retrieves the value of a specified cookie.
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
        log("Cookie not found:", name);
        return null;
    }

    /**
     * Deletes a specified cookie by setting its expiration date in the past.
     */
    function deleteCookie(name) {
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + CONFIG.domain + "; SameSite=Lax; Secure";
        log("Cookie deleted:", name);
    }

    /**
     * Checks if a specific cookie exists.
     */
    function checkCookie(name) {
        var exists = getCookie(name) !== null;
        log("Check cookie existence -", name, ":", exists);
        return exists;
    }

    // ========================
    // UTM Cookie Management
    // ========================

    /**
     * Sets the UTM cookie with the provided UTM parameters.
     */
    function setUTMCookie(utmParams) {
        setCookie(CONFIG.utmCookieName, JSON.stringify(utmParams), CONFIG.utmCookieExpiryDays);
    }

    /**
     * Retrieves and parses the UTM cookie.
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
        log("UTM cookie not found.");
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
        log("Parsing UTM parameters...");
        var currentURL = new URL(window.location.href);
        var params = currentURL.searchParams;

        // List of UTM and tracking parameters to check
        var utmParamKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];

        // Check if any UTM parameter is present in the URL
        var isUTMInURL = utmParamKeys.some(function(key) {
            return params.has(key);
        });

        if (isUTMInURL) {
            var utmParams = {
                utm_source: (params.get("utm_source") || "").toLowerCase(),
                utm_medium: (params.get("utm_medium") || "").toLowerCase(),
                utm_campaign: (params.get("utm_campaign") || "").toLowerCase(),
                utm_term: (params.get("utm_term") || "").toLowerCase(),
                utm_content: (params.get("utm_content") || "").toLowerCase(),
                utm_gclid: params.get("gclid") || "",
                utm_fbclid: params.get("fbclid") || ""
            };
            log("UTM parameters found in URL:", utmParams);
            setUTMCookie(utmParams);
        } else if (document.referrer) {
            log("No UTM parameters in URL. Checking referrer...");
            var referrer;
            try {
                referrer = new URL(document.referrer).hostname;
                log("Referrer hostname:", referrer);
            } catch (e) {
                console.error("Error parsing referrer URL:", e);
                return;
            }

            // If the referrer includes the domain we ignore, skip it
            if (referrer.toLowerCase().includes(CONFIG.referrerToIgnore.toLowerCase())) {
                log("Referrer is ignored:", referrer);
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
                    utm_medium: "helper_ref"
                };
                var existingUTM = getUTMCookie();
                if (existingUTM && existingUTM.utm_medium === "helper_ref") {
                    log("Existing UTM medium is 'helper_ref'. Overwriting with new referrer UTM parameters.");
                    setUTMCookie(referrerUTMParams);
                } else if (!existingUTM) {
                    log("No existing UTM cookie. Setting referrer-based UTM parameters:", referrerUTMParams);
                    setUTMCookie(referrerUTMParams);
                } else {
                    log("Existing UTM cookie present and medium is not 'helper_ref'. Skipping referrer-based UTM parameters.");
                }
            }
        } else {
            log("No UTM parameters in URL and no referrer available.");
        }
    }

    // ===============================
    // HubSpot Forms Telemetry Integration
    // ===============================

    /**
     * Constructor for handling HubSpot forms telemetry.
     */
    function hsFormsTelemetry() {
        this.init = function() {
            log("Initializing HubSpot Forms Telemetry...");
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
                        log("HubSpot Form Ready:", event.data.id);
                        scope.processUTMCookies();
                    }
                    if (event.data.eventName === 'onFormSubmit') {
                        log("HubSpot Form Submit:", event.data.id);
                        scope.handleFormSubmit(event.data.id);
                    }
                }
            });
            log("HubSpot Forms Telemetry initialized.");
        };

        /**
         * Processes UTM cookies and populates HubSpot form fields.
         */
        this.processUTMCookies = function() {
            var utmParams = getUTMCookie();
            if (utmParams) {
                try {
                    log("Populating HubSpot form fields with UTM parameters.");
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
            } else {
                log("No UTM parameters found in cookie. Skipping HubSpot form field population.");
            }
        };

        /**
         * Populates hidden fields in HubSpot forms with UTM parameters.
         */
        this.populateHSField = function(fieldClass, value) {
            try {
                var fields = document.getElementsByClassName(fieldClass);
                log("Found", fields.length, "elements with class", fieldClass);
                for (var i = 0; i < fields.length; i++) {
                    var input = fields[i].querySelector("input");
                    if (input) {
                        input.value = value || "not-set";
                        input.dispatchEvent(new Event("change"));
                        log("Populated HubSpot field:", fieldClass, "with value:", value || "not-set");
                    } else {
                        log("No input found within element with class:", fieldClass);
                    }
                }
            } catch (e) {
                console.error("Could not process field:", fieldClass, e);
            }
        };

        /**
         * Clears the UTM cookie on form submission.
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
                log("Calendar booking succeeded.");
                var userEmail;
                try {
                    userEmail = event.data.meetingsPayload.bookingResponse.postResponse.contact.email;
                    log("Retrieved user email from calendar submission:", userEmail);
                } catch (e) {
                    console.error("Error retrieving user email from calendar submission:", e);
                    return;
                }
                // Push the custom event to the dataLayer
                if (window.dataLayer && Array.isArray(window.dataLayer)) {
                    window.dataLayer.push({ 'event': 'hubspotCalendarSubmit' });
                    log("Pushed 'hubspotCalendarSubmit' event to dataLayer.");
                } else {
                    console.warn("dataLayer is not defined. Initializing and pushing the event.");
                    window.dataLayer = window.dataLayer || [];
                    window.dataLayer.push({ 'event': 'hubspotCalendarSubmit' });
                }
                // formv3(userEmail);
                //clearUTMCookie();
              console.log("activate function to parse utms from calendar submits");
            }
        });
    }

    /**
     * Submits UTM data along with the user's email to HubSpot via API.
     */
    function formv3(email) {
        log("Preparing to submit calendar form with email:", email);
        var utmData = {};
        try {
            var utmCookie = getUTMCookie();
            if (utmCookie) {
                utmData = JSON.parse(utmCookie);
                log("UTM data parsed from cookie:", utmData);
            } else {
                log("No UTM cookie found.");
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

        var currentTime = Date.now();
        log("Current time (ms since epoch):", currentTime);

        var hubspotutk = getCookie('hubspotutk');

        var data = {
            "submittedAt": currentTime,
            "fields": [
                {
                    "name": "email",
                    "value": email
                }
            ],
            "context": {
                "pageUri": window.location.href
            }
        };

        if (hubspotutk && hubspotutk.trim() !== "") {
            data.context.hutk = hubspotutk;
            log("Added 'hutk' to payload:", hubspotutk);
        } else {
            console.warn("hubspotutk cookie not found or empty. 'hutk' will be omitted from the payload.");
        }

        addUTMField(data.fields, "utm_medium", utmMedium);
        addUTMField(data.fields, "utm_source", utmSource);
        addUTMField(data.fields, "utm_campaign", utmCampaign);
        addUTMField(data.fields, "utm_term", utmTerm);
        addUTMField(data.fields, "utm_content", utmContent);
        addUTMField(data.fields, "utm_gclid", utmGclid);
        addUTMField(data.fields, "utm_fbclid", utmFbclid);

        var url = CONFIG.calendarFormEndpoint + CONFIG.portalID + '/' + CONFIG.formID;
        var finalData = JSON.stringify(data);
        log("Final payload to be sent to HubSpot:", finalData);

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: finalData
        })
        .then(function(response) {
            if (response.ok) {
                log("API call successful. Status:", response.status);
                return response.json();
            } else {
                return response.json().then(function(errorData) {
                    throw new Error('API call failed with status ' + response.status + ': ' + JSON.stringify(errorData));
                });
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
     */
    function addUTMField(fields, fieldName, fieldValue) {
        if (fieldValue) {
            fields.push({
                "name": fieldName,
                "value": fieldValue
            });
            log("Added UTM field to payload:", fieldName, "=", fieldValue);
        } else {
            log("UTM field '" + fieldName + "' is empty. Not adding to payload.");
        }
    }


    // ====================
    // UTM Prefill for Webflow Forms
    // ====================

    /**
     * Prefills Webflow form hidden fields with UTM parameters (and hubspotutk) on initial load and subsequent navigations.
     */
    function prefillWebflowForms() {
        log("Starting prefillWebflowForms...");
        var utmParams = getUTMCookie();
        var hubspotutkValue = getCookie('hubspotutk');

        if (!utmParams && !hubspotutkValue) {
            log("No UTM or hubspotutk cookie found. Skipping form prefill.");
            return;
        }

        // Prepare the fields we want to prefill
        var utmFields = {
            utm_source: utmParams ? (utmParams.utm_source || "") : "",
            utm_medium: utmParams ? (utmParams.utm_medium || "") : "",
            utm_campaign: utmParams ? (utmParams.utm_campaign || "") : "",
            utm_term: utmParams ? (utmParams.utm_term || "") : "",
            utm_content: utmParams ? (utmParams.utm_content || "") : "",
            utm_gclid: utmParams ? (utmParams.utm_gclid || "") : "",
            utm_fbclid: utmParams ? (utmParams.utm_fbclid || "") : ""
        };

        var prefillExecuted = false;  // Prevent multiple executions per navigation

        function prefillForm(form) {
            if (prefillExecuted) {
                log("Prefill already executed for this navigation. Skipping.");
                return;
            }
            prefillExecuted = true;
            log("Attempting to prefill form:", form);

            // Fill existing UTM fields only
            for (var key in utmFields) {
                if (utmFields.hasOwnProperty(key)) {
                    var field = form.querySelector('input[name="' + key + '"]');
                    if (field) {
                        field.value = utmFields[key];
                        log("Prefilled form field:", key, "with value:", utmFields[key]);
                    } else {
                        log("Field '" + key + "' not found in form. Skipping.");
                        // Do NOT create the field if it doesn't exist
                    }
                }
            }

            // hubspotutk field if available
            if (hubspotutkValue) {
                var hubspotutkField = form.querySelector('input[name="hubspotutk"]');
                if (hubspotutkField) {
                    hubspotutkField.value = hubspotutkValue;
                    log("Prefilled form field: hubspotutk with value:", hubspotutkValue);
                } else {
                    log("Field 'hubspotutk' not found in form. Skipping.");
                    // Do NOT create the field if it doesn't exist
                }
            }
        }

        // Prefill all existing forms right now
        function executePrefill() {
            var existingForms = document.querySelectorAll('form');
            log("Found", existingForms.length, "existing forms on the page.");
            existingForms.forEach(function(form) {
                prefillForm(form);
            });
        }

        // Run once on page load
        executePrefill();

        // Observe DOM for any new forms (e.g., dynamically added)
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        if (node.tagName && node.tagName.toLowerCase() === 'form') {
                            log("New form detected via MutationObserver:", node);
                            prefillForm(node);
                        } else {
                            var nestedForms = node.querySelectorAll ? node.querySelectorAll('form') : [];
                            if (nestedForms.length > 0) {
                                log("New nested forms detected via MutationObserver:", nestedForms.length);
                                nestedForms.forEach(function(form) {
                                    prefillForm(form);
                                });
                            }
                        }
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
        log("MutationObserver set up to watch for new forms.");

        // Force a re-run if the user navigates via client-side routing
        function onHistoryChange() {
            log("History changed. Executing prefill logic again.");
            prefillExecuted = false; // Allow prefill again for the new page
            parseUTMParams();        // Re-parse in case the URL changed
            executePrefill();        // Prefill existing forms
        }

        // Hook into pushState and replaceState to detect URL changes
        (function(history){
            var pushState = history.pushState;
            history.pushState = function(state) {
                var ret = pushState.apply(history, arguments);
                onHistoryChange();
                return ret;
            };
            var replaceState = history.replaceState;
            history.replaceState = function(state) {
                var ret = replaceState.apply(history, arguments);
                onHistoryChange();
                return ret;
            };
        })(window.history);

        // Listen for popstate event
        window.addEventListener('popstate', function() {
            log("popstate event detected.");
            onHistoryChange();
        });

        // Optionally stop observing after X time for performance
        setTimeout(function() {
            observer.disconnect();
            log("MutationObserver disconnected after 10 minutes.");
        }, 10 * 60 * 1000);

        log("prefillWebflowForms setup completed.");
    }

    // ====================
    // Initialization Logic
    // ====================

    /**
     * Main function: parse UTM, set up HubSpot telemetry, handle calendar submissions,
     * and prefill Webflow forms with UTM/hubspotutk.
     */
    function main() {
        log("Main function started.");
        parseUTMParams();
        new hsFormsTelemetry();
        handleCalendarSubmission();
        prefillWebflowForms();
        log("Main function completed.");
    }

    // Fire `main()` after DOM load for the first page load, or immediately if already loaded
    if (document.readyState === "complete" || document.readyState === "interactive") {
        // Document is already ready, run main immediately
        log("Document already loaded. Running main().");
        main();
    } else {
        // Document not ready yet, wait for DOMContentLoaded
        document.addEventListener('DOMContentLoaded', function() {
            log("DOMContentLoaded event fired.");
            main();
        });
    }

})();
