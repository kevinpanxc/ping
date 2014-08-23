var Music = (function () {
    var music_embed = null;
    var music_control;

    function play() {
        music_embed.play();
        music_control.src = "images/pause_music.ico";
        music_control.onclick = pause;
    }

    function pause() {
        music_embed.pause();
        music_control.src = "images/play_music.ico";
        music_control.onclick = play;
    }

    return {
        initialize : function () {
            music_embed = document.createElement("audio");
            music_embed.setAttribute("src", "music/LithHarbor.mp3");
            music_embed.setAttribute("autoplay", true);
            music_embed.setAttribute("loop", true);
            music_embed.removed = false;
            document.body.appendChild(music_embed);

            music_control = document.getElementById("music_control_button");
            music_control.onclick = pause;
        },

        play : play,

        pause : pause,

        stop : function () {
            document.body.removeChild(music_embed);
            music_embed = null;
        }
    }
})();