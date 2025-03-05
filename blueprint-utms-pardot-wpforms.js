(function() {
    console.log("UTM, Calendar & WPForms Integration Script Loaded");

    // =======================
    // Configuration Variables
    // =======================
    var CONFIG = {
        domain: ".domain.com",                // Domain for cookie setting
        referrerToIgnore: "domain",           // Referrer substring to ignore
        utmCookieName: "utm",                 // Name of the UTM cookie
        utmCookieExpiryDays: 30,              // UTM cookie expiration in days
        pardotFormHandlerEndpoint: 'https://yourpardotdomain.com/formhandler', // Your Pardot form handler URL
        logEnabled: true                      // Toggle for console logging
    };

    // ==================
    // Utility Functions
    // ==================
    function log() {
        if (CONFIG.logEnabled && window.console && console.log) {
            console.log.apply(console, arguments);
        }
    }

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

    function deleteCookie(name) {
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + CONFIG.domain + "; SameSite=Lax; Secure";
        log("Cookie deleted:", name);
    }

    function checkCookie(name) {
        var exists = getCookie(name) !== null;
        log("Check cookie existence -", name, ":", exists);
        return exists;
    }

    // ========================
    // UTM Cookie Management
    // ========================
    function setUTMCookie(utmParams) {
        setCookie(CONFIG.utmCookieName, JSON.stringify(utmParams), CONFIG.utmCookieExpiryDays);
    }

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

    function clearUTMCookie() {
        deleteCookie(CONFIG.utmCookieName);
    }

    function parseUTMParams() {
        log("Parsing UTM parameters...");
        var currentURL = new URL(window.location.href);
        var params = currentURL.searchParams;
        var utmParamKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];
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

    // ==========================================
    // Calendar Submission Handling (Outlook)
    // ==========================================
    /**
     * Listens for postMessages from the Outlook calendar iframe.
     * Adjust the property names as needed based on your calendar’s message payload.
     */
    function handleCalendarSubmission() {
        window.addEventListener('message', function(event) {
            // Assumes the calendar sends { bookingSuccess: true, bookingResponse: { contact: { email: "user@example.com" } } }
            if (event.data && event.data.bookingSuccess) {
                log("Outlook calendar booking succeeded.");
                var userEmail;
                try {
                    userEmail = event.data.bookingResponse.contact.email;
                    log("Retrieved user email from calendar submission:", userEmail);
                } catch (e) {
                    console.error("Error retrieving user email from calendar submission:", e);
                    return;
                }
                // Push a custom event to the dataLayer (if used)
                if (window.dataLayer && Array.isArray(window.dataLayer)) {
                    window.dataLayer.push({ 'event': 'outlookCalendarSubmit' });
                    log("Pushed 'outlookCalendarSubmit' event to dataLayer.");
                } else {
                    window.dataLayer = window.dataLayer || [];
                    window.dataLayer.push({ 'event': 'outlookCalendarSubmit' });
                }
                // Send submission data to Pardot
                sendToPardot(userEmail);
                // Optionally clear the UTM cookie after calendar booking
                // clearUTMCookie();
            }
        });
    }

    /**
     * Submits calendar data along with UTM parameters to Pardot.
     * Sends a POST request with URL-encoded form data.
     */
    function sendToPardot(email) {
        log("Preparing to submit calendar form to Pardot with email:", email);
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

        // Build a payload with the fields expected by your Pardot form handler
        var payloadObj = {
            email: email,
            utm_source: utmData.utm_source || "",
            utm_medium: utmData.utm_medium || "",
            utm_campaign: utmData.utm_campaign || "",
            utm_term: utmData.utm_term || "",
            utm_content: utmData.utm_content || "",
            utm_gclid: utmData.utm_gclid || "",
            utm_fbclid: utmData.utm_fbclid || "",
            submittedAt: Date.now()
        };

        var urlEncodedData = Object.keys(payloadObj).map(function(key) {
            return encodeURIComponent(key) + '=' + encodeURIComponent(payloadObj[key]);
        }).join('&');

        log("Final payload to be sent to Pardot:", urlEncodedData);

        fetch(CONFIG.pardotFormHandlerEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: urlEncodedData
        })
        .then(function(response) {
            if (response.ok) {
                log("Pardot form handler call successful. Status:", response.status);
                return response.text();
            } else {
                return response.text().then(function(errorData) {
                    throw new Error('Pardot form handler call failed with status ' + response.status + ': ' + errorData);
                });
            }
        })
        .then(function(responseData) {
            log("Pardot submission response:", responseData);
        })
        .catch(function(error) {
            console.error("Error submitting calendar form to Pardot:", error.message);
        });
    }

    // ========================================
    // WPForms UTM Prefill Handling
    // ========================================
    /**
     * Iterates over all WPForms on the page (assumed to have the class "wpforms-form")
     * and populates their existing hidden fields for UTM parameters.
     */
    function prefillWPForms() {
        var forms = document.querySelectorAll("form.wpforms-form");
        if (!forms.length) {
            log("No WPForms forms found for prefill.");
            return;
        }
        log("Prefilling " + forms.length + " WPForms form(s) with UTM values...");
        var utmParams = getUTMCookie();
        var utmFields = {
            utm_source: utmParams ? (utmParams.utm_source || "") : "",
            utm_medium: utmParams ? (utmParams.utm_medium || "") : "",
            utm_campaign: utmParams ? (utmParams.utm_campaign || "") : "",
            utm_term: utmParams ? (utmParams.utm_term || "") : "",
            utm_content: utmParams ? (utmParams.utm_content || "") : "",
            utm_gclid: utmParams ? (utmParams.utm_gclid || "") : "",
            utm_fbclid: utmParams ? (utmParams.utm_fbclid || "") : ""
        };

        forms.forEach(function(form) {
            for (var key in utmFields) {
                if (utmFields.hasOwnProperty(key)) {
                    var input = form.querySelector('input[name="' + key + '"]');
                    if (input) {
                        input.value = utmFields[key];
                        log("Prefilled WPForm field", key, "with value:", utmFields[key]);
                    } else {
                        log("Field", key, "not found in form:", form);
                    }
                }
            }
        });
    }

    /**
     * Attaches a submit event listener to all WPForms to clear the UTM cookie upon submission.
     */
    function attachWPFormsSubmitHandler() {
        var forms = document.querySelectorAll("form.wpforms-form");
        if (!forms.length) {
            log("No WPForms forms found for submit handling.");
            return;
        }
        forms.forEach(function(form) {
            form.addEventListener('submit', function() {
                log("WPForm submitted. Clearing UTM cookie.");
                clearUTMCookie();
            });
        });
    }

    /**
     * Sets up a MutationObserver to detect new WPForms on the page and re-run the prefill logic.
     * Also re-executes the logic on client-side navigation.
     */
    function setupPrefillObserver() {
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1 && node.matches && node.matches('form.wpforms-form')) {
                        log("New WPForm detected, prefill.");
                        prefillWPForms();
                    } else if (node.nodeType === 1) {
                        var nestedForms = node.querySelectorAll && node.querySelectorAll('form.wpforms-form');
                        if (nestedForms && nestedForms.length > 0) {
                            log("New nested WPForms detected, prefill.");
                            prefillWPForms();
                        }
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
        log("MutationObserver set up for WPForms prefill.");

        function onHistoryChange() {
            log("History changed. Re-running prefill logic.");
            parseUTMParams(); // In case the URL changed
            prefillWPForms();
        }
        (function(history) {
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
        window.addEventListener('popstate', onHistoryChange);
        setTimeout(function() {
            observer.disconnect();
            log("MutationObserver disconnected after 10 minutes.");
        }, 10 * 60 * 1000);
    }

    // ====================
    // Initialization Logic
    // ====================
    function main() {
        log("Main function started.");
        parseUTMParams();
        handleCalendarSubmission();
        prefillWPForms();
        attachWPFormsSubmitHandler();
        setupPrefillObserver();
        log("Main function completed.");
    }

    if (document.readyState === "complete" || document.readyState === "interactive") {
        log("Document already loaded. Running main().");
        main();
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            log("DOMContentLoaded event fired.");
            main();
        });
    }
})();
