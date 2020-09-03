const openweatherApiKey = "68e985d895310357c44e7e8e21d8e66d";
const iconMap = mapIconCodesToLocalFiles(); // map OpenWeatherMap icon codes to local icons

let city = "Кривой Рог";
let lat = "47.9102734";
let lon = "33.3917703";
let lang = "en";


const openweatherApiUrl = "https://api.openweathermap.org/data/2.5/onecall";
let openweatherApiParams = {
    lat: lat,
    lon: lon,
    exclude: "minutely,hourly",
    appid: openweatherApiKey,
    units: "metric",
    lang: lang
}
const nominatimGeocodeApiUrl = "https://nominatim.openstreetmap.org";
let nominatimApiParams = {
    q: city,
    addressdetails: 1,
    limit: 1,
    "accept-language": "en",
    format: "json"
}

let searchInProgress = 0;

/***********************************************************************/

$("#search-box").on("keypress", (e) => {
    if (e.code === "Enter" || e.code === "NumpadEnter") {
        $("#search-btn").click();
    }
})


$("#search-btn").on("click", () => {
    let q = $("#search-box").val();
    if (searchInProgress > 0 || q.length === 0)
        return;

    $(".weather-box").hide();
    $("#error-msg").hide();
    showLoadingIndicator();
    
    
    lang = detectSearchQueryLanguage();
    $("#error-msg").text(_locale[lang].searchError);
    nominatimApiParams["accept-language"] = lang;
    openweatherApiParams.lang = lang;
    nominatimApiParams.q = $("#search-box").val();
    getWeather();
});


/**
 * Show all loading indicators
 */
function showLoadingIndicator() {
    $("#spinner").show();
    $("#search-btn").addClass("loading");
}

/**
 * Hide all loading indicators
 */
function hideLoadingIndicator() {
    $("#spinner").hide();
    $("#search-btn").removeClass("loading");
}

/**
 * Make an AJAX request for coordinates of the queried location
 * and then a weather forecast
 */
function getWeather() {
    $.get(nominatimGeocodeApiUrl, nominatimApiParams, function (data) {
        //console.log(data);
        searchInProgress++;

        // escape if no results returned
        let noResults = data.length === 0;
        if (noResults) {
            $("#error-msg").show();
            hideLoadingIndicator();
            return;
        }

        // escape if the result returned is not a settlement
        let settlementTypes = ["municipality", "city", "town", "village"];
        let type = Object.getOwnPropertyNames(data[0].address)[0];
        let isSettlement = settlementTypes.includes(type);
        if (!isSettlement) {
            $("#error-msg").show();
            hideLoadingIndicator();
            return;
        }

        openweatherApiParams.lat = data[0].lat;
        openweatherApiParams.lon = data[0].lon;

        // map location to html element
        let locationStr = `${data[0].address[type]}, ${data[0].address.country}`;
        $(".location").text(locationStr);

        // get weather
        $.get(openweatherApiUrl, openweatherApiParams, function (data) {
            //console.log(data);
            searchInProgress++;

            extractCurrentWeather(data);
            extractWeatherForecast(data);

            $(".weather-box").show();
        }).always(() => { 
            searchInProgress--; 
            hideLoadingIndicator();
        });
    }).always(() => { searchInProgress--; });
}

/**
 * Get current weather details and map it to html
 */
function extractCurrentWeather(data) {
    let current = data.current;

    let iconSrc = `icons/${iconMap.get(current.weather[0].icon)}`;
    $(".icon img").attr("src", iconSrc);

    let iconDescription = capitalizeFirstLetter(current.weather[0].description);
    $(".icon-description").text(iconDescription);

    let dateTimeString = convertUnixTimestampToDateTimeString(current.dt);
    $(".date").text(dateTimeString);

    let temperature = `${Math.round(current.temp)} ℃`;
    $(".temp").text(temperature);

    let windStr = `${_locale[lang].wind}: ${convertSpeedMpsToKph(current.wind_speed)} km/h`;
    $(".wind").text(windStr);

    let humidStr = `${_locale[lang].humidity}: ${current.humidity}%`;
    $(".humidity").text(humidStr);

    let pressureStr = `${_locale[lang].pressure}: ${current.pressure} mb`;
    $(".pressure").text(pressureStr);
}

/**
 * Get 5-day weather forecast details and map it to html
 */
function extractWeatherForecast(data) {
    let forecastBoxes = $(".forecast-weather-box").first().children();
    for (let i = 0; i < forecastBoxes.length; i++) {
        let forecast = data.daily[i + 1];

        let dt = convertUnixTimestampToDate(forecast.dt);

        let dayStr = getWeekdayName(dt.getDay(), lang, false);
        $(".day", forecastBoxes[i]).text(dayStr);

        let date = `${dt.getDate()}.${dt.getMonth() + 1}.${dt.getFullYear()}`;
        $(".date", forecastBoxes[i]).text(date);

        let iconSrc = `icons/${iconMap.get(forecast.weather[0].icon)}`;
        $(".icon", forecastBoxes[i]).attr("src", iconSrc);

        let temperature = `${Math.round(forecast.temp.day)} ℃`;
        $(".temperature", forecastBoxes[i]).text(temperature);
    }
}


/**
 * Convert unix timestamp to a new date object
 */
function convertUnixTimestampToDate(unix_timestamp) {
    return new Date(unix_timestamp * 1000);
}

/**
 * Convert unix timestamp to a date-time string (hh:mm dd.MM.yyyy)
 */
function convertUnixTimestampToDateTimeString(unix_timestamp) {
    let dt = convertUnixTimestampToDate(unix_timestamp);
    let time = dt.toTimeString().substr(0, 5);
    let date = `${dt.getDate()}.${dt.getMonth() + 1}.${dt.getFullYear()}`;

    const nbsp = "\xa0\xa0";
    return `${time}${nbsp}${date}`;
}

/**
 * Capitalize the first letter of a string
 */
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Convert meters-per-second to kilometers-per-hour
 */
function convertSpeedMpsToKph(speed) {
    let kph = speed * 3600 / 1000;
    let rounded = Math.round(kph * 10) / 10;
    return rounded;
}


/**
 * Get a name of the day from it's number
 */
function getWeekdayName(dayOfWeek, lang = "en", full = true) {
    lang = lang.toLowerCase();
    lang = lang in _weekdayNames ? lang : "en";
    fullness = full ? "full" : "short";

    let d1 = _weekdayNames[lang];
    let d2 = d1[dayOfWeek];
    try {
        let d3 = d2[fullness];
    } catch (error) {
        console.log(dayOfWeek);
        console.log(_weekdayNames);
    }

    return _weekdayNames[lang][dayOfWeek][fullness];
}


/**
 * VERY simplistic language detection based on the existence of 
 * cyrillic characters in the string. Returns "ru" if cyrillic 
 * characters were found, otherwise returns "en"
 */
function detectSearchQueryLanguage() {
    let q = $("#search-box").val();
    if (/[А-Яа-я]/.test(q)) {
        return "ru";
    }
    else {
        return "en";
    }
}


/**
 * Map OpenWeatherMap icon codes to local icon files
 */
function mapIconCodesToLocalFiles() {
    let iconMap = new Map();
    // day icons
    iconMap.set("01d", "d_c0.png");
    iconMap.set("02d", "d_c1.png");
    iconMap.set("03d", "d_c2.png");
    iconMap.set("04d", "c3.png");
    iconMap.set("09d", "d_r2.png");
    iconMap.set("10d", "d_r1.png");
    iconMap.set("11d", "c3_r3_st.png");
    iconMap.set("13d", "d_s.png");
    iconMap.set("50d", "mist.png");
    // night icons
    iconMap.set("01n", "n_c0.png");
    iconMap.set("02n", "n_c1.png");
    iconMap.set("03n", "n_c2.png");
    iconMap.set("04n", "c3.png");
    iconMap.set("09n", "n_r2.png");
    iconMap.set("10n", "n_r1.png");
    iconMap.set("11n", "c3_r3_st.png");
    iconMap.set("13n", "n_s.png");
    iconMap.set("50n", "mist.png");

    return iconMap;
}