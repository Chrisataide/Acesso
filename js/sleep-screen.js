//create document ready function
var idleTimer_password = ''
var hours = ""
var minutes = ""

function hour(){
    $.ajax({
        type: 'GET',
        url: '/controls/hour_date/',
        data: {},
        datatype: "json",
        success: function (data) {
            $("#entersomething").focus();
            hours = data.hora
            minutes = data.minuto
            console.log("Equipamento ativo","|","Hora:",hours+":"+minutes)
        }
    });
}

setInterval(hour, 1000);

function clock_screen() {
    $(document).ready(function() {

        function displayTime() {
            var meridiem = "AM";

            $("#hour").text(hours+":");
            $("#minutes").text(minutes);
        }

        function displayDay() {
            var currentDay = new Date();
            // var days = ["Sunday,", "Monday,", "Tuesday,", "Wednesday,", "Thursday,", "Friday,", "Saturday,"];
            var days = ["Domingo,", "Segunda, ", "Terça,", "Quarta,", "Quinta,", "Sexta,", "Sábado,"];
            var day = days[currentDay.getDay()];
            $("#day").text(day);
        }

        function displayDate() {
            var currentDate = new Date();
            var year = currentDate.getFullYear();
            var date = currentDate.getDate();
            // var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
            var months = ["de Janeiro", " de Fevereiro", " de Março", " de Abril", " de Maio", " de Junho", " de Julho", " de Agosto", " de Setembro", " de Outubro", " de Novembro", " de Dezembro"];
            var month = months[currentDate.getMonth()];

            if (date < 10) {
                date = "0" + date;
            }

            $("#date").text(date +'  '+ month);
        }
        displayTime();
        setInterval(displayTime, 1000);
        displayDay();
        displayDate();

    });
}

function sleep_scren() {
    idleTimer_dawn = null
    idleTimer_clock = null
    idleTimer_password = null
    idleState = false;
    idlesecond = 60
    idleWait = idlesecond * 500;
    idleWaitTwo = idlesecond * 700;
    idleWaitPassword = idlesecond * 400;
    $(document).ready(function() {

        $(document).on('mousemove', function(event) {
            $('.content-top').removeClass('content-box-sleep')
            $('.content-box-wait').removeClass('content-box-sleep')
            clearTimeout(idleTimer_dawn)
            clearTimeout(idleTimer_clock)
            clearTimeout(time_clock)
            clearTimeout(idleTimer_password)

            idleTimer_dawn = setTimeout(function() {
                if (!$('body').hasClass('no-screen-sleep')) {
                    $('.content-top').addClass('content-box-sleep')
                    $('.content-box-wait').addClass('content-box-sleep')
                }
            }, idleWait);

            if(control_access_user > 1){
                if (!$('body').hasClass('no-screen-sleep')) {  
                    idleTimer_password = setTimeout(function() {
                        pin_control = []
                        dupla = ""
                        control_access_user = 1
                        $("#panel_message").removeClass('password-text')
                        $("#panel_message").text("TEMPO EXCEDIDO")
                        $("#pin-controls").attr("request_permission",'false')
                        $('body').removeClass('no-screen-sleep')
                        setTimeout(function () {
                            $("#panel_message").removeAttr("value",'blocked_keyboard')
                            pin = ""
                            $("#panel_message").text("")
                        }, 3000)
                    }, idleWaitPassword);
                }
            }else{
                // continue
            }

            idleTimer_clock = setTimeout(function() {
                if (!$('body').hasClass('no-screen-sleep')) {
                    clearTimeout(idleTimer_dawn)
                    $('.sleep-time').show()
                    $('.init-smartbox-sleep').show()
                    $('.welcome-bradesco').addClass('hide')
                    $('.index_controls').addClass('hide')
                    $('.content-top').removeClass('content-box-sleep')
                    $('.content-box-wait').removeClass('content-box-sleep')
                    $('.index_controls').removeClass('hide')
                    $('.home-index').addClass('hide')
                    $('.intellibox_pin').addClass('hide')
                    $('.intercom-list_users').addClass('hide')
                    $('.arm_desarm_frame').addClass('hide')
                    $('.cctv_camera').addClass('hide')
                    $('.width-img-cctv').removeClass('zoom')
                    $('.panel-heading').removeClass('menu-zoom')
                    $("#pin-controls").attr("request_permission",'false')
                    control_access_user = 1
                    dupla = ""
                    pin_control = []
                }
            }, idleWaitTwo);

            function mouse_move() {
                $("body").trigger("mousemove");
            }

            if (time_access == true) {
                time_clock = setTimeout(function() {
                    time_access = false
                }, seconds * 5000);
            }

        });

        //INICIO -- BLOCO que capta clique em tags IFRAME/EMBED
        var monitor = setInterval(function() {
            var elem = document.activeElement;
            if (elem && elem.tagName == 'IFRAME') {
                $("body").trigger("mousemove");
                document.activeElement.blur();
            }
        }, 200);
        //FIM


        $("body").trigger("mousemove");
    });


    $('.clock').click(function() {
        $('.clock').addClass('clock-horiz')
    })

    $(".sleep-time").click(function() {
        $('#panel_message').text('')
        pin = ""
        $("body").trigger("mousemove");
        $('.sleep-time').hide()
        $('.init-smartbox-sleep').hide()
    });
}