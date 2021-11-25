var data_alarms = null;

var alarm = {
    set_partition: function (args) {
        var partition = args[0];
        var status = args[1];
        var user_id = args[2];
        var sec = 0
        var btn_back = $('#back');
        var btn_location = $('#location_' + partition);
        var element_count = btn_location.find('span')

        if (status === "arm"){
            $.ajax({
            type: 'POST',
            url: '/controls/set_partition/',
            data: {'partition': partition, 'status': status, 'user_id':user_id},
            datatype: "json",
                success: function (data) {
                    // setTimeout(function(){ 
                    element_count.text("(ARMADO)"); 
                    // }, 60000);
                }
            });
            //btn_back.addClass('disable-btn');
            //btn_location.addClass('disable-btn');
            // sec = 60;
            // var timer = setInterval(function () {
            //     element_count.animate({
            //         opacity: 0.25,
            //         //fontSize: '2em'
            //     }, 500, function () {
            //         element_count.addClass('arm');
            //         element_count.css('opacity', 1);
            //         element_count.css('font-size', '1em');
            //         element_count.text("ARMANDO EM " + sec--);
            //     })

            //     if (sec <= 0) {
            //         clearInterval(timer)
            //         //btn_back.removeClass('disable-btn');
            //         btn_location.removeClass('disable-btn');
            //     }
                
            //     if(sec == 0){
            //         setTimeout(function(){ 
            //             $('.arm').text("(ARMADO)");
            //         }, 1000);
            //     }

            // }, 1000);


        } else {
            $.ajax({
            type: 'POST',
            url: '/controls/set_partition/',
            data: {'partition': partition, 'status': status, 'user_id':user_id},
            datatype: "json",
                success: function (data) {
                    element_count.text("(DESARMADO)")
                }
            });
        }
    }
};

function get_values_zones(){
    $.ajax({
        type: 'POST',
        url: '/getAllStatusZones/',
        data: {},
        datatype: "json",
        success: function (data) {
            try{

                let partition = $('#id_partition_modal_open').val();
                data_alarms = data;
                $('#modal_zones').children().remove();
                Object.keys(data_alarms[partition]).map(function(value, index) {
                    $('#modal_zones').append(
                        '<p>'+ data_alarms[partition][value]['name'] +'</p>'
                    )
                });
            } catch (e){
                console.log(e)
            }
        }
    });
}
get_values_zones();

$( document ).ajaxComplete(function( event, xhr, settings ) {
    if (settings.url.indexOf("/getAllStatusZones") !== -1){
        setTimeout(get_values_zones, 1000);
    }
});

// Function csrf
function getCookie(name) {
    var cookieValue = null;

    if (document.cookie && document.cookie != '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            if (cookie.substring(0, name.length + 1) == (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }

    return cookieValue;
}

$(function () {
    $.ajaxSetup({
        beforeSend: function (xhr, settings) {
            xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
        }
    });
});
