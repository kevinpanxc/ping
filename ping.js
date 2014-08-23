function PointCharge (charge_strength, x_pos, y_pos, polarity, velocity, stationary, id) {
    this.charge_strength = charge_strength;
    this.x_pos = x_pos;
    this.y_pos = y_pos;
    this.polarity = polarity;
    this.velocity = velocity; // points/second
    this.id = id;

    this.stationary = stationary;
}

function Velocity (magnitude, angle) {
    this.magnitude = magnitude;
    this.angle = angle; // in radians
}

var Ping = (function () {
    var current_charge_id = 0;
    var charge_array = [];

    var POINT_CHARGE_RADIUS = 15;

    var ctx;
    var rect;
    var canvas;
    var selected_stationary_charge = -1;
    var number_of_stationary_charges;

    // mouse booleans
    var is_mouse_down = false;

    // program loop information
    var re_draw_interval;
    var REDRAW_INTERVAL_TIME = 50; // milliseconds
    var new_element_interval;
    var NEW_ELEMENT_INTERVAL_TIME = 2000;

    // misc constants
    var FADE_TIME = 5000;
    var NUMBER_OF_ELEMENTS_BEFORE_FADING = 14;
    var NUMBER_OF_ELEMENTS_ALLOWED = 20;

    function mouse_up () {
        is_mouse_down = false;
        re_draw();
    }

    function mouse_down(e) {
        e.preventDefault();
        var index_of_charge_element = mouse_check_and_return_index(e.pageX - rect.left, e.pageY - rect.top);
        if (index_of_charge_element >= 0) {
            cursor_x = (e.pageX - rect.left - canvas.offsetLeft) - charge_array[index_of_charge_element].x_pos;
            cursor_y = (e.pageY - rect.top - canvas.offsetTop) - charge_array[index_of_charge_element].y_pos;
            is_mouse_down = true;
            selected_stationary_charge = index_of_charge_element;
        }
    }

    function mouse_moved(e) {
        if (is_mouse_down) {
            document.body.style.cursor = 'pointer';
            var new_x_position = (e.pageX - rect.left - canvas.offsetLeft) - cursor_x;
            var new_y_position = (e.pageY - rect.top - canvas.offsetTop) - cursor_y;
            var current_element = charge_array[selected_stationary_charge];
            current_element.x_pos = new_x_position;
            current_element.y_pos = new_y_position;
        }
        else {
            if ( mouse_check_and_return_index(e.pageX - rect.left, e.pageY - rect.top) >= 0 ) document.body.style.cursor = 'pointer';
            else document.body.style.cursor = 'default';
        }
    }

    function mouse_check_and_return_index(x, y){
        // sets mouse booleans
        // returns relevant charge element index
        for (var i = number_of_stationary_charges - 1; i >= 0; i--){
            if ((x - canvas.offsetLeft) > (charge_array[i].x_pos - POINT_CHARGE_RADIUS)  &&  (x - canvas.offsetLeft) < (charge_array[i].x_pos + POINT_CHARGE_RADIUS)
            && (y - canvas.offsetTop) > (charge_array[i].y_pos - POINT_CHARGE_RADIUS)   &&  (y - canvas.offsetTop) < (charge_array[i].y_pos + POINT_CHARGE_RADIUS)){
                return i;
            }
        }
        return -1;
    }

    function draw_element (index) {
        var element = charge_array[index];
        var point_charge_gradient = ctx.createRadialGradient(element.x_pos,element.y_pos,5,element.x_pos,element.y_pos,POINT_CHARGE_RADIUS);
        if (element.polarity == 1) {
            point_charge_gradient.addColorStop(0, 'rgba(0,0,0,1)');
            point_charge_gradient.addColorStop(0.8, 'rgba(200,200,200,.9)');
            point_charge_gradient.addColorStop(1, 'rgba(255,255,255,0)');
        } else if (element.polarity == -1) {
            point_charge_gradient.addColorStop(0, 'rgba(255,36,36,1)');
            point_charge_gradient.addColorStop(0.8, 'rgba(255,125,125,.5)');
            point_charge_gradient.addColorStop(1, 'rgba(255,255,255,0)');           
        }
        if (element.start_fade) {
            if ( element.fade_level > FADE_TIME ) ctx.globalAlpha = 0;
            else ctx.globalAlpha = 1 - ( element.fade_level / FADE_TIME );
        }
        ctx.fillStyle = point_charge_gradient;
        ctx.beginPath();
        ctx.arc(element.x_pos, element.y_pos, POINT_CHARGE_RADIUS, 0, Math.PI*2, true);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    function draw_element_highlight_lines (index) {
        var element = charge_array[index];
        ctx.beginPath();
        ctx.strokeStyle = "#E2E2E2";
        ctx.arc(element.x_pos, element.y_pos, POINT_CHARGE_RADIUS + 1, 0, Math.PI*2, true);
        ctx.stroke();   
    }

    function re_draw () {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (var i = 0; i < charge_array.length; i++) {
            if (!charge_array[i].stationary) set_new_velocity(i);
        }

        for (var i = 0; i < charge_array.length; i++) {
            if (!charge_array[i].stationary) {
                var velocity = charge_array[i].velocity;
                charge_array[i].x_pos += ( ( velocity.magnitude * Math.cos(velocity.angle) ) * REDRAW_INTERVAL_TIME / 1000 );
                charge_array[i].y_pos += ( ( velocity.magnitude * Math.sin(velocity.angle) ) * REDRAW_INTERVAL_TIME / 1000 );            
                if (charge_array[i].start_fade) charge_array[i].fade_level += REDRAW_INTERVAL_TIME;           
            } else {
                draw_element_highlight_lines (i);
            }
            draw_element(i);
        }
    }

    function set_new_velocity (index) {
        var element = charge_array[index];
        for (var i = 0; i < charge_array.length; i++) {
            if (i != index) {
                var angle = get_angle(element.x_pos, element.y_pos, charge_array[i].x_pos, charge_array[i].y_pos);
                var distance = get_distance(element.x_pos, element.y_pos, charge_array[i].x_pos, charge_array[i].y_pos);
                var acceleration_magnitude = get_acceleration_magnitude(distance, element, charge_array[i], charge_array[i].stationary);
                var new_v_x;
                var new_v_y;

                new_v_x = element.velocity.magnitude * Math.cos(element.velocity.angle) + acceleration_magnitude * Math.cos(angle);
                new_v_y = element.velocity.magnitude * Math.sin(element.velocity.angle) + acceleration_magnitude * Math.sin(angle);

                element.velocity.magnitude = Math.sqrt( new_v_x * new_v_x + new_v_y * new_v_y );

                var temp = Math.abs( Math.atan( new_v_y / new_v_x ) );

                if ( new_v_x > 0) {
                    if ( new_v_y > 0 ) element.velocity.angle = temp;
                    else element.velocity.angle = 2 * Math.PI - temp;
                } else {
                    if ( new_v_y > 0 ) element.velocity.angle = Math.PI - temp;
                    else element.velocity.angle = Math.PI + temp;                    
                }
            }
        }
    }

    function get_distance (x1, y1, x2, y2) {
        var x_dist = x2 - x1;
        var y_dist = y2 - y1;
        return Math.sqrt(x_dist * x_dist + y_dist * y_dist);
    }

    function get_angle (x1, y1, x2, y2) {
        if (x1 == x2) return Math.PI/2;

        var x_dist = x2 - x1;
        var y_dist = y2 - y1;

        var temp = Math.abs( Math.atan(y_dist/x_dist) );

        if (x_dist > 0) {
            if (y_dist > 0) return temp;
            else return 2 * Math.PI - temp;
        } else {
            if (y_dist > 0) return Math.PI - temp;
            return Math.PI + temp;
        }
    }

    function get_acceleration_magnitude (distance, e1, e2, between_stationary) {
        if (between_stationary && distance < 60) distance = 60;
        else if (distance < 4) distance = 4;
        return 5000 * e1.charge_strength * e2.charge_strength * e1.polarity * e2.polarity * -1 / ( distance * distance );
    }

    function add_random_point () {
        if (charge_array.length <= NUMBER_OF_ELEMENTS_ALLOWED + number_of_stationary_charges) {
            var x_negative = Math.round(Math.random());
            var y_negative = Math.round(Math.random());
            var x_pos;
            var y_pos;
            if (x_negative == 0) x_pos = Math.floor(Math.random() * 100) + 900;
            else x_pos = Math.floor(Math.random() * -100) - 20;

            if (y_negative == 0) y_pos = Math.floor(Math.random() * 100) + 600;
            else y_pos = Math.floor(Math.random() * -100) - 20;

            charge_array.push(new PointCharge(1, x_pos, y_pos, -1, new Velocity(0, Math.PI/4), false, current_charge_id++));
        }
        if (charge_array.length > NUMBER_OF_ELEMENTS_BEFORE_FADING + number_of_stationary_charges) {
            if (!charge_array[number_of_stationary_charges].start_fade) {
                charge_array[number_of_stationary_charges].start_fade = true;
                charge_array[number_of_stationary_charges].fade_level = 0;
            } else if ( charge_array[number_of_stationary_charges].fade_level > (FADE_TIME / 2) ) {
                if (!charge_array[number_of_stationary_charges + 1].start_fade) {
                    charge_array[number_of_stationary_charges + 1].start_fade = true;
                    charge_array[number_of_stationary_charges + 1].fade_level = 0;
                }
                if ( charge_array[number_of_stationary_charges].fade_level > (3 * FADE_TIME / 4) ) {
                    if (!charge_array[number_of_stationary_charges + 2].start_fade) {
                        charge_array[number_of_stationary_charges + 2].start_fade = true;
                        charge_array[number_of_stationary_charges + 2].fade_level = 0;
                    }
                }
                if (charge_array[number_of_stationary_charges].fade_level > FADE_TIME) charge_array.splice(number_of_stationary_charges, 1);
            }
        }
    }

    function enable_mouse_actions() {
        canvas.onmouseup = mouse_up;
        canvas.onmousedown = mouse_down;
        canvas.onmousemove = mouse_moved;     
    }

    function disable_mouse_anctions() {
        canvas.onmouseup = null;
        canvas.onmousedown = null;
        canvas.onmousemove = null;        
    }

    function start () {
        re_draw_interval = setInterval(re_draw, REDRAW_INTERVAL_TIME);
        new_element_interval = setInterval(add_random_point, NEW_ELEMENT_INTERVAL_TIME);
        enable_mouse_actions();        
    }

    return {
        initialize : function () {
            canvas = document.getElementById("canvas");
            ctx = canvas.getContext("2d");
            rect = canvas.getBoundingClientRect();

            Maps.switch_maps("DEFAULT");

            start();
        },

        stop : function () {
            clearInterval(re_draw_interval);
            clearInterval(new_element_interval);
            disable_mouse_anctions();
            charge_array = [];
            current_charge_id = 0;
        },

        start : start,

        add_stationary_charge : function (charge_strength, x_pos, y_pos, polarity) {
            charge_array.push(new PointCharge(charge_strength, x_pos, y_pos, polarity, null, true, current_charge_id++));
        },

        set_number_of_stationary_charges : function (number) {
            number_of_stationary_charges = number;
        }
    }
})();

var Maps = (function (ping) {
    // calculating a point on a circle's circumference
    // x = cx + r * cos(a); y = cy + r * sin(a)

    // cx = 440, cy = 300

    var MAPS = {
        "DEFAULT" : {
            initialize : function () {
                ping.add_stationary_charge(30, 200, 200, 1);
                ping.add_stationary_charge(30, 680, 200, 1);
                ping.add_stationary_charge(30, 680, 400, 1);
                ping.add_stationary_charge(30, 200, 400, 1);

                ping.set_number_of_stationary_charges(4);
            }
        },

        "WHEEL" : {
            initialize : function () {
                ping.add_stationary_charge(6, 440, 300, -1);

                ping.add_stationary_charge(4, 290, 300, 1);
                ping.add_stationary_charge(4, 590, 300, 1);
                ping.add_stationary_charge(4, 440, 150, 1);
                ping.add_stationary_charge(4, 440, 450, 1);

                ping.add_stationary_charge(4, 546, 406, 1);
                ping.add_stationary_charge(4, 334, 406, 1);
                ping.add_stationary_charge(4, 546, 194, 1);
                ping.add_stationary_charge(4, 334, 194, 1);

                ping.add_stationary_charge(4, 579, 357, 1);
                ping.add_stationary_charge(4, 301, 357, 1);
                ping.add_stationary_charge(4, 579, 243, 1);
                ping.add_stationary_charge(4, 301, 243, 1);

                ping.add_stationary_charge(4, 497, 439, 1);
                ping.add_stationary_charge(4, 383, 439, 1);
                ping.add_stationary_charge(4, 497, 161, 1);
                ping.add_stationary_charge(4, 383, 161, 1);

                ping.set_number_of_stationary_charges(17);
            }
        },

        "LINE" : {
            initialize : function () {
                ping.add_stationary_charge(10, 600, 300, 1);
                ping.add_stationary_charge(10, 570, 300, 1);
                ping.add_stationary_charge(10, 540, 300, 1);
                ping.add_stationary_charge(10, 510, 300, 1);
                ping.add_stationary_charge(10, 480, 300, 1);
                ping.add_stationary_charge(10, 450, 300, 1);
                ping.add_stationary_charge(10, 420, 300, 1);
                ping.add_stationary_charge(10, 390, 300, 1);
                ping.add_stationary_charge(10, 360, 300, 1);
                ping.add_stationary_charge(10, 330, 300, 1);
                ping.add_stationary_charge(10, 300, 300, 1);

                ping.set_number_of_stationary_charges(11);
            }
        }
    }
    return {
        initialize_ui : function () {
            var list = document.getElementById("map_selector_list");
            for (var map in MAPS) {
                var li = document.createElement("li");
                var img = document.createElement("img");
                img.src = "images/" + map.toLowerCase() + ".png";
                li.appendChild(img);
                li.onclick = (function (map_string) {
                    return function () { Maps.switch_maps(map_string); }
                })(map);
                li.title = map;
                list.appendChild(li);
            }
        }, 

        switch_maps : function (map) {
            Ping.stop();
            MAPS[map].initialize();
            Ping.start();
        }
    }
})(Ping);