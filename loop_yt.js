(function() {
    /* we need this global to clear an interval for flash videos
     * on repeated invocations of the script
     */
    if (typeof _loop_yt_interval_id !== typeof undefined) {
        clearInterval(_loop_yt_interval_id);
    }
    _loop_yt_interval_id = null;

    var YT_PLAYER_STATES = {
        unstarted: -1,
        ended:      0,
        playing:    1,
        paused:     2,
        buffering:  3,
        cued:       5,
    };

    var COLORS = {
        faded_green: '#88ff88',
        faded_red: '#ffcccc',
        white: '#ffffff',
    };

    /* in milliseconds */
    var TICK_INTERVAL = 500;

    /* Returns an object result, where:
     *      result.player_type is one of "html5", "flash", null
     *      result.player is the player element, if player_type is not null
     */
    function detect_video_type() {
        var check = document.getElementsByTagName("video");
        if (check.length !== 0) {
            return { player_type: "html5", player: check[0] };
        }

        check = document.getElementById("movie_player");
        if (check !== null) {
            return { player_type: "flash", player: check };
        }

        return { player_type: null, player: null };
    }


    var toolbox_html = '' +
        '<div id="loop-yt-div" style="position: relative; margin: 5px">' +
            '<label> Start: <input placeholder="MM:SS" id="loop-yt-start" type="text"/></label>' +
            '<label> Stop: <input placeholder="MM:SS" id="loop-yt-stop" type="text"/></label>' +
        '</div>';
    function get_start_time_input() { return document.getElementById('loop-yt-start') || {}; }
    function get_stop_time_input() { return document.getElementById('loop-yt-stop') || {}; }

    function create_element_from_html_string(html_string) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html_string;
        return tmp.firstChild;
    }

    function in_range(val, low, high) { return low <= val && val < high; }

    function clamp(val, min, max) {
        if (val < min) {
            return min;
        } else if (val > max) {
            return max;
        }
        return val;
    }

    /* Parse [HH:]MM:SS and return the number of seconds. Returns -1 on failure. */
    function parseSecondsFromString(time_str) {
        var parts = time_str.trim().split(':');
        if (parts.length != 2 && parts.length != 3) {
            return -1;
        }

        /* pop() returns undefined on empty array.
         * parseInt returns NaN on invalid input.
         * Accept strings of length two for seconds.
         * Accept strings of length one or two for minutes.
         * Accept strings of any length for hours.
         */
        var ss_str = parts.pop();
        var mm_str = parts.pop();
        var hh_str = parts.pop();
        var ss = Number.parseInt(ss_str.length == 2 ? ss_str : "");
        var mm = Number.parseInt(mm_str.length <= 2 ? mm_str : "");
        var hh = Number.parseInt(hh_str);

        if ((parts.length == 3 && isNaN(hh))
            || isNaN(mm) || isNaN(ss)
            || !in_range(mm, 0, 60) || !in_range(ss, 0, 60)) {
            return -1;
        }

        if (!isNaN(hh)) {
            return 60 * 60 * hh + 60 * mm + ss;
        } else {
            return 60 * mm + ss;
        }
    }

    function set_background_status_color(element, status) {
        if (status) {
            element.style.backgroundColor = COLORS.faded_green;
        } else {
            element.style.backgroundColor = COLORS.faded_red;
        }
    }

    function get_start_time(max_value) {
        var n_secs = parseSecondsFromString(get_start_time_input().value || "");
        set_background_status_color(get_start_time_input(),
                                    n_secs >= 0 && n_secs < max_value);
        if (n_secs > max_value) {
            return 0;
        } else {
            return clamp(n_secs, 0, max_value);
        }
    }

    function get_stop_time(max_value) {
        var n_secs = parseSecondsFromString(get_stop_time_input().value || "");
        var start_time = get_start_time(max_value);
        set_background_status_color(get_stop_time_input(),
                                    n_secs > start_time && n_secs <= max_value);
        return clamp(n_secs, start_time, max_value);
    }

    function register_time_input_callbacks(video_duration) {
        get_start_time_input().oninput = get_start_time(video_duration);
        get_stop_time_input().oninput = get_stop_time(video_duration);
    }

    function video_id_from_url(url) {
        if (typeof url !== typeof "") {
            return null;
        }

        var parts = url.split('v=');
        if (parts.length !== 2) {
            return null;
        }

        /* if '&' not in the string, split returns an array of length 1
         * containing the original string.
         */
        var subparts = parts[1].split('&');
        return subparts[0];
    }

    function handle_html5(yp) {
        /* If the video is paused/ended, start it when I click the script */
        register_time_input_callbacks(yp.duration);
        yp.play();

        yp.loop = true;

        /* use a callback to loop with custom start/end events */
        function update_func() {
            var start_time = get_start_time(yp.duration);
            var stop_time = get_stop_time(yp.duration);
            if (yp.currentTime < start_time
                || (start_time < stop_time && stop_time < yp.currentTime)) {
                yp.currentTime = start_time;
            }
        }

        // yp.ontimeupdate = update_func
        _loop_yt_interval_id = setInterval(update_func, TICK_INTERVAL);
    }

    /* A bug prevents this from working with a callback on state changes
     * in firefox. Instead, use setInterval.
     *
     * Relevant issue:
     *     https://code.google.com/p/gdata-issues/issues/detail?id=6531
     */
    function handle_flash(yp) {
        register_time_input_callbacks(yp.getDuration());

        var url = yp.getVideoUrl();
        var video_id = video_id_from_url(url);
        if (video_id === null) {
            console.log("Failed to parse video id from url");
            return;
        }

        /* Check each second if we should seek to either the beginning
         * or the specified start time. The global variable _loop_yt_interval_id
         * is used to ensure only one interval is set at a time.
         */
        _loop_yt_interval_id = setInterval(function() {
            var state = yp.getPlayerState();

            var start_time = get_start_time(yp.getDuration());
            var stop_time = get_stop_time(yp.getDuration());
            if (state === YT_PLAYER_STATES.ended
                || (start_time < stop_time && yp.getCurrentTime() > stop_time - 0.001)
                || yp.getCurrentTime() < start_time) {
                /* docs: loadVideoById(id, startSeconds, suggestedQuality), returns nothing. */
                // yp.loadVideoById(video_id, start_time);
                yp.seekTo(start_time);
            }
        }, TICK_INTERVAL);

        /* If the video is paused/ended, start it when I click the script */
        var state = yp.getPlayerState();
        if (state === YT_PLAYER_STATES.ended
            || state == YT_PLAYER_STATES.paused
            || state == YT_PLAYER_STATES.unstarted) {
            var start_time = get_start_time(yp.getDuration());
            if (yp.getCurrentTime() < start_time) {
                // yp.loadVideoById(video_id, start_time);
                yp.seekTo(start_time);
            }
            yp.playVideo();
        }
    }

    function setup_toolbox() {
        if (document.getElementById('loop-yt-div') === null) {
            var info = document.getElementById('info');
            var loop_yt_div = create_element_from_html_string(toolbox_html);
            info.insertBefore(loop_yt_div, info.firstChild);
        }
    }

    function set_loop() {
        var result = detect_video_type();
        if (result.player_type === "html5") {
            console.log("found html5");
            console.log(result.player);
            handle_html5(result.player);
        } else if (result.player_type === "flash") {
            handle_flash(result.player);
        } else {
            console.log("Unable to find a video element");
        }
    }

    console.log("Running LoopYT");
    setup_toolbox();
    set_loop();
})();