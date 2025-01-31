/**
 * UTM Parameters Handler
 * 
 * Hierarchy Logic:
 * 1. **UTM Present:** If any UTM parameters are found in the URL, delete all existing UTM cookies and set new ones based on the UTM parameters.
 * 2. **Referrer Present:** If no UTM parameters are in the URL but a referrer exists (and is not in the ignore list), set/overwrite UTM cookies based on the referrer's domain only if 'utm_medium' is "direct", "none", or not set.
 * 3. **Direct Traffic:** If neither UTM parameters nor a referrer are present, set 'utm_source' to "direct" and 'utm_medium' to "none" only if no UTM cookies are already set.
 */

// ==========================
// Configuration Section
// ==========================

// List of referrer substrings to ignore (e.g., "proofserve" will ignore "proofserve.com", "proofserve.io", "app.proofserve.com", etc.)
var referrersToIgnore = ["yourowndomain"];

// List of known organic referrer hostnames
var organicHostnames = ["google", "bing", "facebook", "linkedin", "twitter", "instagram"];

// ==========================
// Utility Functions
// ==========================

/**
 * Sets a cookie with the given name, value, and expiration days.
 * @param {string} name - Cookie name.
 * @param {string} value - Cookie value.
 * @param {number} days - Expiration in days.
 */
function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + encodeURIComponent(value) + expires + "; domain=.example.com; path=/; Secure; SameSite=Lax";
}

/**
 * Retrieves the value of a cookie by its name.
 * @param {string} name - Cookie name.
 * @returns {string|null} - Cookie value or null if not found.
 */
function getCookie(name) {
    var nameEQ = name + "=";
    var ca = decodeURIComponent(document.cookie).split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i].trim();
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

/**
 * Deletes a cookie by setting its expiration date to a past date.
 * @param {string} name - Cookie name.
 */
function deleteCookie(name) {
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=.example.com; path=/; Secure; SameSite=Lax";
}

// ==========================
// Main Function to Parse and Store UTM Parameters
// ==========================

/**
 * Parses UTM parameters from the URL or referrer and stores each parameter in its own cookie.
 * Follows a specific hierarchy to determine how cookies are set or overwritten.
 */
function parseAndStoreUTMParameters() {
    var currentURL = new URL(window.location.href);
    var params = currentURL.searchParams;
    var utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_gclid", "utm_fbclid"];
    var hasUTM = false;

    // Check if any UTM parameters are present in URL
    for (var i = 0; i < utmKeys.length; i++) {
        var key = utmKeys[i];
        var urlParam = (key === "utm_gclid") ? "gclid" : (key === "utm_fbclid" ? "fbclid" : key);
        if (params.get(urlParam)) {
            hasUTM = true;
            break;
        }
    }

    if (hasUTM) {
        // Rule 1: UTM Present - Delete all existing UTM cookies
        for (i = 0; i < utmKeys.length; i++) {
            deleteCookie(utmKeys[i]);
        }

        // Set new UTM cookies based on URL parameters
        for (i = 0; i < utmKeys.length; i++) {
            key = utmKeys[i];
            urlParam = (key === "utm_gclid") ? "gclid" : (key === "utm_fbclid" ? "fbclid" : key);
            var value = params.get(urlParam);
            if (value) {
                setCookie(key, value.toLowerCase(), 30);
            }
        }
    } else if (document.referrer) {
        // Rule 2: Referrer Present - Process referrer
        handleReferrer(document.referrer);
    } else {
        // Rule 3: Direct Traffic - Handle direct traffic
        handleDirectTraffic();
    }
}

/**
 * Handles referrer-based UTM cookies.
 * @param {string} referrerURL - The referrer URL.
 */
function handleReferrer(referrerURL) {
    try {
        var referrer = new URL(referrerURL).hostname.toLowerCase();

        // Check if referrer contains any substring to ignore
        for (var i = 0; i < referrersToIgnore.length; i++) {
            if (referrer.indexOf(referrersToIgnore[i]) !== -1) {
                return;
            }
        }

        var parts = referrer.split(".");
        var domain = "not-set";
        if (parts.length === 2) {
            domain = parts[0];
        } else if (parts.length === 3) {
            domain = parts[1];
        }

        if (domain !== "not-set") {
            var medium = (organicHostnames.indexOf(domain) !== -1) ? "organic" : "referral";
            var existingMedium = getCookie("utm_medium");
            if (existingMedium === "direct" || existingMedium === "none" || !existingMedium) {
                setCookie("utm_source", domain, 30);
                setCookie("utm_medium", medium, 30);
            }
        }
    } catch (e) {
        console.error("Invalid referrer URL:", e);
    }
}

/**
 * Handles direct traffic by setting default UTM cookies.
 */
function handleDirectTraffic() {
    var existingMedium = getCookie("utm_medium");
    if (!existingMedium) {
        setCookie("utm_source", "direct", 30);
        setCookie("utm_medium", "none", 30);
    }
}

// Execute the UTM parsing function on page load
parseAndStoreUTMParameters();
