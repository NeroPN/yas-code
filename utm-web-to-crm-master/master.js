/**
 * Unified UTM Parameter Handler and Form Integration
 * Version 1.0.2 
 * 
 * This script handles UTM parameter tracking and form integrations across multiple platforms.
 * It can be loaded via Google Tag Manager and supports both traditional page loads and PWAs.
 * 
 * Hierarchy Logic:
 * 1. **UTM Present:** If any UTM parameters are found in the URL, delete all existing UTM cookies and set new ones based on the UTM parameters.
 * 2. **Referrer Present:** If no UTM parameters are in the URL but a referrer exists (and is not in the ignore list), set/overwrite UTM cookies based on the referrer's domain only if 'utm_medium' is "direct", "none", or not set.
 * 3. **Direct Traffic:** If neither UTM parameters nor a referrer are present, set 'utm_source' to "direct" and 'utm_medium' to "none" only if no UTM cookies are already set.
 * 
 * Written by: Paul Nispel - yoyaba.com
 */

(function() {
    'use strict';

    // =======================
    // Configuration Section
    // =======================
    var CONFIG = {
        // Core Settings
        domain: '.example.com',                // Domain for cookie setting
        referrersToIgnore: ['example'],          // List of referrer substrings to ignore
        utmCookieName: 'utm_params',             // Name of the UTM cookie
        utmCookieExpiryDays: 90,                 // UTM cookie expiration in days
        logEnabled: true,                        // Toggle for console logging
        handleHistoryChange: true,               // Enable handling of history changes for SPAs

        // Form Integration Toggles
        enableHubspotForms: false,               // Enable HubSpot forms integration
        enableHubspotCalendar: false,            // Enable HubSpot calendar integration
        enablePardotForms: false,                // Enable Pardot forms integration
        enableWebflowForms: false,               // Enable Webflow forms integration
        enableWPForms: false,                    // Enable WPForms integration

        // List of known organic referrer hostnames
        organicHostnames: [
            'google', 'bing', 'facebook', 
            'linkedin', 'twitter', 'instagram'
        ],

        // Form Field Mappings
        formFields: {
            // Default form field mappings
            utm_source: 'utm_source',
            utm_medium: 'utm_medium',
            utm_campaign: 'utm_campaign',
            utm_term: 'utm_term',
            utm_content: 'utm_content',
            gclid: 'gclid',
            fbclid: 'fbclid'
        },

        // WPForms specific field mappings (customize these IDs based on your form)
        wpFormsFields: {
            utm_campaign: 'wpforms[fields][1]',
            utm_medium: 'wpforms[fields][1]',
            utm_source: 'wpforms[fields][1]',
            utm_content: 'wpforms[fields][1]',
            utm_term: 'wpforms[fields][1]'
        },

        // HubSpot Settings
        hubspot: {
            portalId: '',
            formIds: [],
            calendarEndpoint: 'https://api.hsforms.com/submissions/v3/integration/submit/'
        },

        // Pardot Settings
        pardot: {
            formHandlerEndpoint: '',
            formIds: []
        }
    };

    // ==================
    // Utility Functions
    // ==================

    /**
     * Logs messages to the console if logging is enabled
     */
    function log() {
        if (CONFIG.logEnabled && window.console && console.log) {
            console.log('[UTM Handler]', arguments[0], arguments[1] || '', arguments[2] || '');
        }
    }

    /**
     * Sets a cookie with the specified name, value, and expiration days
     */
    function setCookie(name, value, days) {
        var expires = '';
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = '; expires=' + date.toUTCString();
        }
        document.cookie = name + '=' + encodeURIComponent(value) + expires +
                         '; path=/; domain=' + CONFIG.domain + '; SameSite=Lax; Secure';
        log('Cookie set:', name, value);
    }

    /**
     * Retrieves the value of a specified cookie
     */
    function getCookie(name) {
        var nameEQ = name + '=';
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i].trim();
            if (c.indexOf(nameEQ) === 0) {
                try {
                    var decodedValue = decodeURIComponent(c.substring(nameEQ.length, c.length));
                    log('Cookie retrieved:', name, decodedValue);
                    return decodedValue;
                } catch (e) {
                    console.error('Error decoding cookie:', e);
                    return null;
                }
            }
        }
        return null;
    }

    /**
     * Deletes a specified cookie
     */
    function deleteCookie(name) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + CONFIG.domain + '; SameSite=Lax; Secure';
        log('Cookie deleted:', name);
    }

    /**
     * Retrieve a parameter value from the URL query string
     */
    function getURLParameter(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        var results = regex.exec(window.location.search);
        return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }

    // ========================
    // UTM Parameter Management
    // ========================

    /**
     * Core UTM parameter handler
     */
    var UTMHandler = {
        utmKeys: [
            'utm_source',
            'utm_medium',
            'utm_campaign',
            'utm_term',
            'utm_content',
            'gclid',
            'fbclid'
        ],

        /**
         * Initialize the UTM handler
         */
        init: function() {
            this.handleUTMParameters();
            if (CONFIG.handleHistoryChange) {
                this.setupHistoryChangeListener();
            }
        },

        /**
         * Handle UTM parameters
         */
        handleUTMParameters: function() {
            var hasUTM = false;
            var utmParams = {};

            // Check URL for UTM parameters
            for (var i = 0; i < this.utmKeys.length; i++) {
                var key = this.utmKeys[i];
                var value = getURLParameter(key);
                if (value) {
                    hasUTM = true;
                    if (key !== 'gclid' && key !== 'fbclid') {
                        value = value.toLowerCase();
                    }
                    utmParams[key] = value;
                }
            }

            if (hasUTM) {
                // Rule 1: UTM Present
                deleteCookie(CONFIG.utmCookieName);
                setCookie(CONFIG.utmCookieName, JSON.stringify(utmParams), CONFIG.utmCookieExpiryDays);
                log('UTM cookie set from URL:', utmParams);
            } else if (document.referrer) {
                // Rule 2: Referrer Present
                this.handleReferrer();
            } else {
                // Rule 3: Direct Traffic
                this.handleDirectTraffic();
            }
        },

        /**
         * Handle referrer-based UTM parameters
         */
        handleReferrer: function() {
            try {
                var referrer = new URL(document.referrer).hostname.toLowerCase();
                var shouldIgnore = CONFIG.referrersToIgnore.some(function(ignore) {
                    return referrer.indexOf(ignore.toLowerCase()) !== -1;
                });

                if (shouldIgnore) {
                    return;
                }

                var existingUTM = this.getUTMCookie();
                var currentMedium = existingUTM.utm_medium || '';

                if (currentMedium === 'direct' || currentMedium === 'none' || !currentMedium) {
                    var parts = referrer.split('.');
                    var domain = parts.length === 2 ? parts[0] : 
                               parts.length === 3 ? parts[1] : 
                               parts.length > 3 ? parts[parts.length - 2] : 'not-set';

                    if (domain !== 'not-set') {
                        var medium = CONFIG.organicHostnames.indexOf(domain) !== -1 ? 'organic' : 'referral';
                        existingUTM.utm_source = domain;
                        existingUTM.utm_medium = medium;
                        setCookie(CONFIG.utmCookieName, JSON.stringify(existingUTM), CONFIG.utmCookieExpiryDays);
                        log('UTM cookie updated from referrer:', existingUTM);
                    }
                }
            } catch (e) {
                console.error('Error handling referrer:', e);
            }
        },

        handleDirectTraffic: function() {
            var existingUTM = this.getUTMCookie();
            if (!existingUTM || !existingUTM.utm_medium) {
                var directParams = {
                    utm_source: 'direct',
                    utm_medium: 'none'
                };
                setCookie(CONFIG.utmCookieName, JSON.stringify(directParams), CONFIG.utmCookieExpiryDays);
                log('UTM cookie set for direct traffic:', directParams);
            }
        },

        getUTMCookie: function() {
            var cookie = getCookie(CONFIG.utmCookieName);
            if (cookie) {
                try {
                    return JSON.parse(cookie);
                } catch (e) {
                    console.error('Error parsing UTM cookie:', e);
                    return {};
                }
            }
            return {};
        },

        /**
         * Set up history change listener for SPAs
         */
        setupHistoryChangeListener: function() {
            var self = this;
            var pushState = history.pushState;
            history.pushState = function() {
                pushState.apply(history, arguments);
                self.handleUTMParameters();
            };

            window.addEventListener('popstate', function() {
                self.handleUTMParameters();
            });
        }
    };

    // ========================
    // Form Integration Handlers
    // ========================

    /**
     * HubSpot Forms Integration
     */
    var HubSpotHandler = {
        init: function() {
            if (!CONFIG.enableHubspotForms) return;
            
            window.addEventListener('message', function(event) {
                if (event.data.type === 'hsFormCallback') {
                    if (event.data.eventName === 'onFormReady') {
                        HubSpotHandler.prefillForm(event.data.id);
                    }
                }
            });
        },

        prefillForm: function(formId) {
            var utmParams = UTMHandler.getUTMCookie();
            if (!utmParams) return;

            Object.keys(utmParams).forEach(function(param) {
                var fieldName = 'hs_' + param;
                var value = utmParams[param];
                if (value) {
                    HubSpotHandler.setHubSpotFieldValue(fieldName, value);
                }
            });
        },

        setHubSpotFieldValue: function(name, value) {
            var field = document.querySelector('[name="' + name + '"]');
            if (field) {
                field.value = value;
                field.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    };

    /**
     * Webflow Forms Integration
     */
    var WebflowHandler = {
        init: function() {
            if (!CONFIG.enableWebflowForms) return;

            document.addEventListener('DOMContentLoaded', function() {
                WebflowHandler.prefillForms();
            });

            if (CONFIG.handleHistoryChange) {
                var observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        if (mutation.addedNodes.length) {
                            WebflowHandler.prefillForms();
                        }
                    });
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }
        },

        prefillForms: function() {
            var forms = document.querySelectorAll('form');
            forms.forEach(function(form) {
                WebflowHandler.prefillForm(form);
            });
        },

        prefillForm: function(form) {
            var utmParams = UTMHandler.getUTMCookie();
            if (!utmParams) return;

            Object.keys(CONFIG.formFields).forEach(function(key) {
                var field = form.querySelector('[name="' + CONFIG.formFields[key] + '"]');
                if (field && utmParams[key]) {
                    field.value = utmParams[key];
                }
            });
        }
    };

    /**
     * WordPress/Gravity Forms Integration
     */
    var WordPressHandler = {
        init: function() {
            if (!CONFIG.enableWPForms) return;

            document.addEventListener('DOMContentLoaded', function() {
                WordPressHandler.prefillForms();
            });

            if (CONFIG.handleHistoryChange) {
                var observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        if (mutation.addedNodes.length) {
                            WordPressHandler.prefillForms();
                        }
                    });
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            }
        },

        prefillForms: function() {
            var forms = document.querySelectorAll('.gform_wrapper form, .wp-block-form form');
            forms.forEach(function(form) {
                WordPressHandler.prefillForm(form);
            });
        },

        prefillForm: function(form) {
            var utmParams = UTMHandler.getUTMCookie();
            if (!utmParams) return;

            Object.keys(CONFIG.formFields).forEach(function(key) {
                var field = form.querySelector('[name*="' + CONFIG.formFields[key] + '"]');
                if (field && utmParams[key]) {
                    field.value = utmParams[key];
                }
            });
        }
    };

    /**
     * Pardot Forms Integration
     */
    var PardotHandler = {
        init: function() {
            if (!CONFIG.enablePardotForms) return;

            document.addEventListener('DOMContentLoaded', function() {
                PardotHandler.prefillForms();
            });
        },

        prefillForms: function() {
            var forms = document.querySelectorAll('form[action*="pardot"]');
            forms.forEach(function(form) {
                PardotHandler.prefillForm(form);
            });
        },

        prefillForm: function(form) {
            var utmParams = UTMHandler.getUTMCookie();
            if (!utmParams) return;

            Object.keys(CONFIG.formFields).forEach(function(key) {
                var field = form.querySelector('[name="' + CONFIG.formFields[key] + '"]');
                if (field && utmParams[key]) {
                    field.value = utmParams[key];
                }
            });
        }
    };

    // ========================
    // Calendar Integration
    // ========================

    /**
     * HubSpot Calendar Integration
     */
    var CalendarHandler = {
        init: function() {
            if (!CONFIG.enableHubspotCalendar) return;

            window.addEventListener('message', function(event) {
                if (event.data.meetingBookSucceeded) {
                    CalendarHandler.handleBooking(event.data);
                }
            });
        },

        handleBooking: function(data) {
            var utmParams = UTMHandler.getUTMCookie();
            if (!utmParams) return;

            var email = data.meetingsPayload?.bookingResponse?.contact?.email;
            if (!email) return;

            var payload = {
                submittedAt: Date.now(),
                fields: [
                    { name: 'email', value: email }
                ],
                context: {
                    hutk: getCookie('hubspotutk'),
                    pageUri: window.location.href
                }
            };

            // Add UTM parameters to payload
            Object.keys(utmParams).forEach(function(param) {
                if (utmParams[param]) {
                    payload.fields.push({
                        name: param,
                        value: utmParams[param]
                    });
                }
            });

            // Send to HubSpot
            if (CONFIG.hubspot.portalId) {
                fetch(CONFIG.hubspot.calendarEndpoint + CONFIG.hubspot.portalId + '/' + CONFIG.hubspot.formIds[0], {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).then(function(response) {
                    log("Calendar booking data sent to HubSpot:", response.ok);
                }).catch(function(error) {
                    console.error("Error sending calendar booking data:", error);
                });
            }
        }
    };

    // ========================
    // Initialization
    // ========================

    /**
     * Initialize all enabled components
     */
    function init() {
        // Core UTM handling (always enabled)
        UTMHandler.init();

        // Initialize form handlers based on configuration
        HubSpotHandler.init();
        WebflowHandler.init();
        WordPressHandler.init();
        PardotHandler.init();
        CalendarHandler.init();

        log("UTM Handler initialized with configuration:", CONFIG);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export UTM parameter getter for external use
    window.getUTMParameters = UTMHandler.getUTMCookie.bind(UTMHandler);
})();
