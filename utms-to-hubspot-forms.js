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
        // Get UTM values from local storage
        // var utmParams = this.getLocalStorage("utm");

        // Get UTM values from cookie
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

    // Get UTM values from local storage

    // this.getLocalStorage = function (name) {
       //  var value = localStorage.getItem(name);
        // return value;
    // };

    this.trackHSFormSubmitted = function (formId) {
        // Implement your tracking logic for HubSpot form submissions here if wanted
    };

    // INIT TELEMETRY
    this.init();
}

// START
new hsFormsTelemetry();
