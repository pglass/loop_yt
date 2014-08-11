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

    function handle_html5(yp) {
        /* If the video is paused/ended, start it when I click the script */
        yp.play();

        yp.loop = true;
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

    /* A bug prevents this from working with a callback on state changes
     * in firefox. Instead, just reload the current video within its frame.
     *
     * Relevant issue:
     *     https://code.google.com/p/gdata-issues/issues/detail?id=6531
     */
    function handle_flash(yp) {
        var url = yp.getVideoUrl();
        var video_id = video_id_from_url(url);
        if (video_id === null) {
            console.log("Failed to parse video id from url");
            return;
        }

        /* Check each second if the video has ended. If so, reload it.
         * If this script is called again, the global id is used to clear
         * the interval beforehand.
         */
        _loop_yt_interval_id = setInterval(function() {
            var state = yp.getPlayerState();
            if (state === YT_PLAYER_STATES.ended) {
                /* docs: loadVideoById(id, startSeconds, suggestedQuality)
                 *        returns nothing.
                 */
                yp.loadVideoById(video_id, 0);
            }
        }, 1000);

        /* If the video is paused/ended, start it when I click the script */
        var state = yp.getPlayerState();
        if (state === YT_PLAYER_STATES.ended
            || state == YT_PLAYER_STATES.paused
            || state == YT_PLAYER_STATES.unstarted) {
            yp.playVideo();
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
    set_loop();
})();