var pin = ""
var asterisk = ""
var blocked = false // Quando envia uma solicitacao (enter/coacao), retorno e deixa boqueado o teclado
var play_audio = null
var salutation = ""
var new_pin = false
var old_pin = ""
var access_granted = false
var time_access = ""
var seconds = 60
var time_clock = null
var temp_pin = ""
var control_snapshot = 0
var type_system = "SmartAccess"
var dupla = ""
var control_access = ""
var control_access_user = 1
var pin_control = []
var try_access = 0
var control_time =  seconds * 50
var control_timeout = null
var limit_pin = 7
var accessibility_port = ''
var no_block = ''

$("#entersomething").focus();

setInterval(function () {
    var c = $('#entersomething').attr("accessibility_port")

    if(c == 'true'){
        accessibility_port = true
        limit_pin = 8
    }else{
        accessibility_port = false
    }

}, 1000);

// funcao para bloquear o print screen que aparece após o acesso garantido.
function block_printsrc(){
    $(document).keydown(function(objEvent) {       
        if (objEvent.ctrlKey) {         
            if (objEvent.keyCode == 80) {               
                objEvent.preventDefault();           
                objEvent.stopPropagation();
                return false;
            }           
        }       
    });
}

$(function(){

    function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, '\\$&');
        var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    }

    function set_type_system(){
        type_system = !getParameterByName('type_system') ? "SmartAccess" : getParameterByName('type_system')
        info_reverse = type_system === "SmartAccess" ? "SmartAlarm" : "SmartAccess"

        var type_control = $('#pin-controls')[0].className
        if(type_control == 1 ){
            type_system == 'SmartAccess'
        }else if(type_control == 2){
            type_system = 'SmartAlarm'
        }else{
            $('#system').text("Alterar para " + info_reverse)
        }
    
    }

    set_type_system()

    $(document).on("dragstart", function(e) {
        if (e.target.nodeName.toUpperCase() == "IMG" || e.target.nodeName.toUpperCase() == "AREA") {
            return false;
        }
    });

    setInterval(function () {
        var hour = new Date().getHours()
        salutation = 'OLÁ';
    }, 1000);

    $(document).on("click", ".type_control #system", function (e) {
        var o = $(this);
        var keyboard = o.text();
        var audio_keyboard = document.getElementById("audio_keyboard");
        audio_keyboard.play();
        if (keyboard.indexOf("SmartAlarm") > 0){
            o.text(keyboard.replace("SmartAlarm", "SmartAccess"))
            type_system = "SmartAlarm"
        } else {
            o.text(keyboard.replace("SmartAccess", "SmartAlarm"))
            type_system = "SmartAccess"
        }
        console.log(keyboard);
        $('.logo_atk').attr('src','/static/imagens/'+type_system+'.png')
        //blocked = true
    });

    function check_block(){
        $.ajax({
            type: 'GET',
            url: '/is_block/',
            data: {},
            datatype: "json",
            success: function (data) {
                if(data.success == true){
                    $("#panel_message").removeClass('password-text')
                    $("#panel_message").attr("value",'blocked_keyboard')
                    $("#panel_message").text('BLOQUEIO REMOTO')
                    no_block = 'true'
                    setTimeout(function(){
                        $.ajax({
                            type: 'POST',
                            url: '/is_block/',
                            data: {"no_block":no_block},
                            datatype: "json",
                            success: function (data) {
                                $("#panel_message").removeAttr("value",'blocked_keyboard')
                                $("#panel_message").text("")
                                $("#panel_message").addClass('password-text')
                            }
                        });
                    },10000)
                }
            }
        });
    }

    setInterval(function () {
        check_block()
    }, 1700);
    
    check_connection = () => {
        $.ajax({
            url: "controls/check_connection/",
            type: 'GET',
            data: {},
            dataType: "json",
            success: function (data) {
                if (!data){
                    limit_pin = 8;
                } else {
                    limit_pin = 7;
                }
            }
        });
    };

    check_connection()

    $( document ).ajaxComplete(function( event, xhr, settings ) {
        if (settings.url.indexOf("check_connection") !== -1){
            setTimeout(check_connection, 5000);
        }
    });

    function capture_img(){
        var url = "controls/capture_img/";
        $.ajax({
            url: url,
            type: 'GET',
            data:{pin:temp_pin},
            dataType: "json",
            success: function(data){

                if(data.success == "no_face" && control_snapshot == 0){
                    setTimeout(function () {
                        $("#panel_message").removeClass('password-text')
                        $("#panel_message").text('FACE NÃO ENCONTRADA')
                        setTimeout(function () {
                            $("#panel_message").removeAttr("value",'blocked_keyboard')
                            $('body').addClass('no-screen-sleep')
                            $("#panel_message").removeClass('password-text')
                            $("#panel_message").text("TENTE NOVAMENTE")

                            setTimeout(function () {
                                control_snapshot = 1
                                cadastry_face()
                            },2000)

                        },3000)
                    },3000)
                    return data
                }else if (data.success == "no_face" && control_snapshot == 1 ){
                    $("#panel_message").text("BIOMETRIA NÃO DETECTADA")
                    setTimeout(function () {
                        $("#panel_message").removeAttr("value",'blocked_keyboard')
                        $("#panel_message").text("")
                        $("#panel_message").addClass('password-text')
                        // if(size_smart < 600){
                        // 	$('.display-capture-img').addClass('hide')                        	
                        // }
                        picam_remove()
                        $('body').removeClass('no-screen-sleep')
                        control_snapshot = 0
                    },3000)
                }else{
                    $("#panel_message").text("BIOMETRIA CADASTRADA")
                    $("#pin-controls").attr("request_permission",'first_registration')
                    setTimeout(function () {
                        $("#panel_message").removeAttr("value",'blocked_keyboard')
                        $('body').removeClass('no-screen-sleep')
                        $("#panel_message").text("")
                        $("#panel_message").addClass('password-text')
                        $("#panel_message").removeClass('hide')
                        if(size_smart < 600){
                        	$('.display-capture-img').addClass('hide')
					        $('.pin_controls_capture').show()
					        $(".pin_controls_capture").removeClass('hide')                        	
                        }
                        control_snapshot = 0
                    },3000)
                }
            }
        });
    }

    function control_biometric(){
        $('.acquiring-biometrics').addClass('hide')
        $("#panel_message").text("ADQUIRINDO BIOMETRIA 3")
        $('body').addClass('no-screen-sleep')
        setTimeout(function () {
            $("#panel_message").removeAttr("value",'blocked_keyboard')
            $("#panel_message").text("ADQUIRINDO BIOMETRIA 2")
            setTimeout(function () {
                $("#panel_message").text("ADQUIRINDO BIOMETRIA 1")
                setTimeout(function () {
                    $("#panel_message").text("VALIDANDO BIOMETRIA")
                    setTimeout(function () {
                        if(control_snapshot == 0 ){
                            response = capture_img()
                        }else{
                            control_snapshot = 1
                            response = capture_img()
                        }
                    },3000)
                },1500)
            },1500)
        },1500)
    }

    function cadastry_face(){
        $('.password-control').addClass('hide')
        $('.acquiring-biometrics').removeClass('hide')
		if(size_smart < 600){
	        $('.pin_controls_capture').hide()
	        $(".pin_controls_capture").addClass('hide')
        }
        $('.access-denied').addClass('hide')
        $('.display-capture-img').removeClass('hide')
        $('#panel_message').removeClass('password-text')
        $("#panel_message").text("ADQUIRINDO BIOMETRIA")
        if(control_snapshot == 0){
            var audio_biometric = document.getElementById("audio_biometric");
            audio_biometric.play();
            setTimeout(function () {
                control_biometric()
            },7000)
        }else{
            control_biometric()
        }
    }

    function click_keyboard(){
        clearTimeout(control_timeout)
        $('#panel_message').removeClass('flash')
        $("#panel_message").text("")
        pin=""
        $("#panel_message").addClass('password-text')
        blocked = false
    }

    function control_blocked(){
        $("#entersomething").focus();
        var panel_message = $('#panel_message') 
        if ($(panel_message).hasClass("password-text") || $(panel_message).hasClass("new_pin")) {
            blocked = false
            $("#panel_message").addClass('password-text')
        }else{
            if($("#panel_message").attr("value") == 'blocked_keyboard'){
                blocked = true
            }else{
                click_keyboard()
            }
        }
    }

    function picam_remove(){
        $("#entersomething").focus();
    	if(size_smart < 600){    		
	        $('.display-capture-img').addClass('hide')
	        $(".pin_controls_capture").removeClass('hide')
			$('.pin_controls_capture').show()
            $('#recognze_eyes').addClass('hide')
    	}
    }

    function confirm_auth(offline){
        if (type_system === "SmartAccess"){
            blocked = true
            if(!offline){
                setTimeout(function () {
                    if (blocked) {
                        $("#panel_message").text("RECONHECENDO FACE")
                        $("#panel_message").attr("value",'blocked_keyboard')

                        if("#panel_message" != ""){
                            $("#panel_message").removeClass('password-text')
                        }else{
                            $("#panel_message").addClass('password-text')
                        }
                    }
                }, 1500)
            }
            $.ajax({
                type: 'POST',
                url: '/controls/confirm_auth/',
                data: {'pin': pin ,'system': type_system,"dupla":dupla,"pin_control":pin_control},
                datatype: "json",
                success: function (data) {
                    console.log(data.pass)
                    if (data.pass == "incorrectPass") {
                        blocked = false
                        $('#panel_message').removeClass('blink');

                        if("#panel_message" != ""){
                            $("#panel_message").removeClass('password-text')
                        }else{
                            $("#panel_message").addClass('password-text')
                        }
                        console.log(dupla)
                        try_access += 1
                        if(try_access == 3 && dupla){
                            try_access = 0
                            control_access_user = 1
                            $("#panel_message").text("TENTATIVA EXCEDIDA")
                            $("#pin-controls").attr("request_permission",'false')
                            pin_control = []
                            dupla = ""
                            setTimeout(function () {
                                $("#panel_message").removeAttr("value",'blocked_keyboard')
                                $("#panel_message").text("")
                            }, 3000)
                        }else{
                            $("#panel_message").removeAttr("value",'blocked_keyboard')
                            $("#panel_message").text("SENHA INCORRETA")
                        }

                        control_timeout = setTimeout(function() {
                            $("#panel_message").text("")
                            $("#panel_message").addClass('password-text')
                        }, control_time)

                        var audio_error = document.getElementById("audio_error");
                        audio_error.play();
                    } else if( data.pass == "others" ){
                        
                        if(data.schedule_others == 'in'){
                            $("#panel_message").text("AGUARDE CONTATO DA CENTRAL")
                            $("#panel_message").removeAttr("value",'blocked_keyboard')
                            $("#pin-controls").attr("request_permission",'false')
                        }else{
                            $("#panel_message").text("HORARIO NÃO PERMITIDO")
                            control_timeout = setTimeout(function(){
                                $("#panel_message").text("")
                                $("#panel_message").addClass('password-text')
                            }, control_time);
                        }

                    } else if (data.pass == "correctPass") {
                        if (data.force_password_change && data.access == "accessAllow"){
                            blocked = false
                            $('#panel_message').removeClass('blink');
                            $('#panel_message').addClass('new_pin')
                            $("#panel_message").text("DIGITE UM NOVO PIN")
                            $('#panel_message').removeClass('animated flash');
                            picam_remove()
                            $('body').addClass('no-screen-sleep')
                            new_pin = true
                            old_pin = data["pin"]
                        } else if (data.mode == 0) {
                            if (data.access == "accessAllow") {
                                $('#panel_message').removeClass('blink');
                                $('#panel_message').removeClass('animated flash');
                                $("#panel_message").text(salutation + " " + data.name)
                                setTimeout(function () {
                                    $('#panel_message').removeClass('blink');
                                    // $('.spinner').removeClass('hide')
                                    $("#panel_message").attr("value",'blocked_keyboard')
                                    $("#panel_message").text("SOLICITANDO AUTORIZAÇÃO")
                                    $('body').addClass('no-screen-sleep')
                                }, 1000)
                                var audio_requesting = document.getElementById("audio_requesting");
                                audio_requesting.play();
                                $.ajax({
                                    type: 'POST',
                                    url: '/controls/request_access/',
                                    data: {
                                        'pin_user': data.pin_user,
                                        'coercion': data.coercion,
                                        'dupla':dupla,
                                    },
                                    datatype: "json",
                                    success: function (data) {
                                        blocked = false
                                        pin_control.push(data.pin_user)
                                        $('#panel_message').removeClass('blink');
                                        if (data.response == "allow") {
                                            control_access_user += 1
                                            if(data.dupla == "dupla2"){
                                                blocked = true
                                                $("#panel_message").text("PERMISSÃO VÁLIDA")
                                                // $("body").trigger("mousemove");
                                                $('body').removeClass('no-screen-sleep')
                                                $("body").trigger("mousemove");
                                                control_timeout = setTimeout(function () {
                                                    $('body').addClass('no-screen-sleep')
                                                    $("#panel_message").removeAttr("value",'blocked_keyboard')
                                                    $("#panel_message").text("AGUARDANDO NOVO ACESSO")
                                                    picam_remove()
                                                    var audio_waiting = document.getElementById("audio_waiting");
                                                    audio_waiting.play();
                                                    blocked = false
                                                        if(control_access_user < 2){
                                                            console.log(pin_control)
                                                        }
                                                }, control_time)

                                                dupla = control_access_user
                                            }else{
                                                blocked = false
                                                $("#panel_message").removeAttr("value",'blocked_keyboard')
                                                $("#panel_message").text("ACESSO GARANTIDO")
                                                $('body').removeClass('no-screen-sleep')
                                                block_printsrc()
                                                control_access_user = 1
                                                $("#pin-controls").attr("request_permission",'false')
                                                control_timeout = setTimeout(function(){
                                                    $("#panel_message").text("")
                                                    picam_remove()
                                                    $("#panel_message").addClass('password-text')
                                                }, control_time);
                                                var audio_allow = document.getElementById("audio_allow");
                                                audio_allow.play();
                                                dupla = ""
                                                pin_control = []
                                                console.log(pin_control)
                                                access_granted = true
                                            }

                                        } else if (data.response == "deny") {
                                            $('#panel_message').removeClass('blink');
                                            try_access += 1
                                            if(try_access == 3 && dupla){
                                                try_access = 0
                                                control_access_user = 1
                                                $("#panel_message").text("TENTATIVA EXCEDIDA")
                                                $("#pin-controls").attr("request_permission",'false')
                                                pin_control = []
                                                dupla = ""
                                                setTimeout(function () {
                                                    $("#panel_message").removeAttr("value",'blocked_keyboard')
                                                    $("#panel_message").text("")
                                                }, 3000)
                                            }else{      
                                                $("#panel_message").removeAttr("value",'blocked_keyboard')
                                                $("#pin-controls").attr("request_permission",'false')
                                                $("#panel_message").text("ACESSO NEGADO")
                                                $("body").trigger("mousemove");
                                                control_timeout = setTimeout(function(){
                                                    // $('.index_controls').addClass('hide')
                                                    $("#panel_message").text("")
                                                    picam_remove()
                                                    $('.home-index').removeClass('hide')
                                                }, control_time);
                                            }

                                            $('#panel_message').one(function () {
                                                $('#panel_message').removeClass('animated flash');
                                                setTimeout(function () {
                                                    $("#panel_message").text("")
                                                }, 1000)
                                            });

                                            var audio_denied = document.getElementById("audio_denied");
                                            audio_denied.play();

                                        }else if (data.response == 'error'){
                                            blocked = true
                                            $('#panel_message').removeClass('blink');
                                            $("#panel_message").removeAttr("value",'blocked_keyboard')
                                            $("#panel_message").text("FALHA NA COMUNICAÇÃO")
                                            $('body').removeClass('no-screen-sleep')
                                            $("body").trigger("mousemove");
                                            $('.spinner').addClass('hide')
                                            control_timeout =  setTimeout(function(){
                                                $("#panel_message").text("")
                                                picam_remove()
                                                $("#panel_message").addClass('password-text')
                                                $('.home-index').removeClass('hide')
                                                blocked = false
                                            }, control_time);

                                            $('#panel_message').one(function () {
                                                $('#panel_message').removeClass('animated flash');
                                                setTimeout(function () {
                                                    $("#panel_message").text("")
                                                }, 1000)
                                            });
                                        }else{
                                            blocked = true
                                            $("#panel_message").text("SOLICITAÇÃO NÃO PROCESSADA")
                                            $("body").trigger("mousemove");
                                            $('body').removeClass('no-screen-sleep')
                                            setTimeout(function () {
                                                picam_remove()
                                                $("#panel_message").text("")
                                                $("#panel_message").addClass('password-text')
                                                blocked = false
                                            }, 3000)

                                            var audio_unauthorized_request = document.getElementById("audio_unauthorized_request");
                                            audio_unauthorized_request.play();
                                        }
                                    }
                                })
                            } else if (data.access == "accessDenied") {
                                blocked = false
                                $('#panel_message').removeClass('blink');
                                if(data.picture == 500){
                                    cadastry_face()
                                }else{
                                    try_access += 1
                                    if(try_access == 3 && dupla){
                                        try_access = 0
                                        control_access_user = 1
                                        $("#panel_message").text("TENTATIVA EXCEDIDA")
                                        $("#pin-controls").attr("request_permission",'false')
                                        pin_control = []
                                        dupla = ""
                                        setTimeout(function () {
                                            $("#panel_message").removeAttr("value",'blocked_keyboard')
                                            $("#panel_message").text("")
                                        }, 3000)
                                    }else{       
                                        $("#panel_message").text("ACESSO NEGADO")
                                        $("#pin-controls").attr("request_permission",'false')
                                        var audio_denied = document.getElementById("audio_denied");
                                        audio_denied.play();
                                        setTimeout(function () {
                                            picam_remove()
                                            $("#panel_message").removeAttr("value",'blocked_keyboard')
                                            $("#panel_message").text("")
                                            $("#panel_message").addClass('password-text')
                                        }, 3000)
                                    }
                                }
                            }
                        } else {
                            if (data.access == "accessAllow") {
                                pin_control.push(data.pin)
                                control_access_user += 1
                                if(data.dupla == "dupla2"){
                                    $("#panel_message").text("PERMISSÃO VÁLIDA")
                                    $("body").trigger("mousemove");
                                    control_timeout =  setTimeout(function () {
                                        $('body').addClass('no-screen-sleep')
                                        $("#panel_message").removeAttr("value",'blocked_keyboard')
                                        $("#panel_message").text("AGUARDANDO NOVO ACESSO")
                                        picam_remove()
                                        var audio_waiting = document.getElementById("audio_waiting");
                                        audio_waiting.play();
                                    }, control_time)
                                    dupla = control_access_user
                                }else{
                                    var audio_allow = document.getElementById("audio_allow");
                                    audio_allow.play();
                                    $("#panel_message").removeAttr("value",'blocked_keyboard')
                                    $("#panel_message").text("ACESSO GARANTIDO")
                                    $("#pin-controls").attr("request_permission",'false')
                                    block_printsrc()
                                    $("body").trigger("mousemove");
                                    clearTimeout(idleTimer_password)
                                    control_access_user = 1
                                    dupla = ""
                                    pin_control = []
                                    access_granted = true
                                    // pin_control.push(pin)

                                    setTimeout(function () {
                                        $('#panel_message').removeClass('blink');
                                        $('#panel_message').removeClass('animated flash').addClass('animated flash').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function () {
                                            $('#panel_message').removeClass('animated flash');
                                            if (type_system == "SmartAccess") {
                                                $("#panel_message").text(salutation + " " + data.name)
                                                $("#panel_message").addClass('password-text')
                                            }
                                        });
                                    }, 1500)
                                    control_timeout = setTimeout(function() {
                                        blocked = false
                                        picam_remove()
                                        $('#panel_message').removeClass('flash')
                                        $("#panel_message").text("")
                                        $("#panel_message").addClass('password-text')
                                    }, control_time)
                                }

                            } else if (data.access == "accessDenied") {
                                blocked = false

                                if(data.picture == 500){
                                    cadastry_face()
                                }else{
                                    try_access += 1
                                    if(try_access == 3 && dupla){
                                        try_access = 0
                                        control_access_user = 1
                                        $("#panel_message").text("TENTATIVA EXCEDIDA")
                                        $("#pin-controls").attr("request_permission",'false')
                                        pin_control = []
                                        dupla = ""
                                        setTimeout(function () {
                                            $("#panel_message").removeAttr("value",'blocked_keyboard')
                                            $("#panel_message").text("")
                                        }, 3000)
                                    }else{                                                    
                                        $('#panel_message').removeClass('blink');
                                        
                                        $("#panel_message").removeAttr("value",'blocked_keyboard')
                                        $("#panel_message").text("ACESSO NEGADO")
                                        $("#pin-controls").attr("request_permission",'false')
                                        control_timeout = setTimeout(function () {
                                            picam_remove()
                                            $("#panel_message").text("")
                                            $("#panel_message").addClass('password-text')
                                        }, control_time)
                                    }

                                    var audio_denied = document.getElementById("audio_denied");
                                    audio_denied.play();
                                    // setTimeout(function () {
                                    //     $("#panel_message").text("")
                                    //     $("#panel_message").addClass('password-text')
                                    // }, 2000)
                                }
                                $('body').removeClass('no-screen-sleep')
                                $("body").trigger("mousemove");
                            }
                        }
                    }
                },
                complete: function (data, data2) {
                },
                error: function (xhr, textStatus, thrownError) {
                }
            });
        } else {
            if (type_system === "SmartAlarm"){
                blocked = true
                $.ajax({
                    type: 'POST',
                    url: '/controls/confirm_auth_smartalarm/',
                    data: {'pin': pin},
                    datatype: "json",
                    success: function (data) {
                        blocked = false
                        if (data.pass == "incorrectPass") {
                            blocked = false
                            $('#panel_message').removeClass('blink');
                            $("#panel_message").removeClass('password-text')
                            $("#panel_message").text("SENHA INCORRETA")


                            control_timeout = setTimeout(function () {
                                $("#panel_message").text("")
                            }, control_time)

                            var audio_error = document.getElementById("audio_error");
                            audio_error.play();
                        } else if (data.pass == "correctPass") {
                            if (data.force_password_change){
                                $("#panel_message").removeClass('password-text')
                                $('#panel_message').addClass('new_pin')
                                $("#panel_message").text("DIGITE UM NOVO PIN")
                                picam_remove()
                                new_pin = true
                                old_pin = data["pin"]
                            } else {
                                $("#panel_message").removeClass('password-text')
                                var audio_allow = document.getElementById("audio_allow");
                                audio_allow.play();
                                $("#panel_message").text("ACESSO GARANTIDO")
                                $('body').addClass('no-screen-sleep')
                                block_printsrc()
                                setTimeout(function () {
                                    window.location.replace("/controls/arm_desarm/?user_id=" + data.user_id)
                                }, 500)
                            }
                        }
                    }
                });
            }
        }
        pin = ""
        asterisk = ""
    }

    $(document).on("click", "#pin-controls div button", function (e) {
        $("#entersomething").focus();
        control_blocked()
        $('body').removeClass('no-screen-sleep')
        $('.new_pin').text('')
        $('#panel_message').removeClass('new_pin')
        if (!blocked) {
            e.preventDefault()
            $('#panel_message').removeClass('blink message_red'); // Retira o efeito de piscar
            var o = $(this);
            var keyboard = o.attr('id').replace('number_', '').split('_')[0];
            var audio_keyboard = document.getElementById("audio_keyboard");
            audio_keyboard.play();
            var pin_length = pin.length

            if (pin == "" && keyboard != "enter") {
                pin = keyboard
                asterisk = "*"
            // } else if (pin_length < 7 && pin != "enter" && pin != "backspace" && keyboard != "enter") {
               } else if (pin_length < limit_pin && pin != "enter" && pin != "backspace" && keyboard != "enter") {
                pin = pin + keyboard
                asterisk = asterisk + "*"
                //pin.replace('backspace', '').replace('enter', '')
            }
            // reconfirm_password()
            if (keyboard == "enter" && pin_length >= 6) { // Pedido de confirmacao
                $("#entersomething").focus();
                var request_permission = $("#pin-controls").attr("request_permission")
                temp_pin = pin
                pin = pin.replace('enter', '') // Retira a string enter da variavel pin
                // reconfirm_password()
                if (new_pin){
                    new_pin = false
                    blocked = true
                    $('#panel_message').removeClass('animated flash').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function () {
                        $('#panel_message').removeClass('animated flash');
                        setTimeout(function () {
                            $('#panel_message').removeClass('blink');
                            $("#panel_message").text("COMUNICANDO COM O SERVIDOR")
                        }, 1000)
                    });
                    $.ajax({
                        type: 'POST',
                        url: '/controls/alter_pass/',
                        data: {'old_pin': old_pin, 'new_pin': pin, 'system': type_system},
                        datatype: "json",
                        success: function (data) {
                            blocked = false
                            old_pin = ""
                            var response_msg = ""
                            if (data.response == "duplicate"){
                                $("#panel_message").removeClass('password-text')
                                response_msg = "SENHA JÁ CADASTRADA"
                                setTimeout(function () {
                                    $('#panel_message').text('')
                                    pin =""
                                    $('#panel_message').removeClass('animated flash');
                                    $("#panel_message").addClass('password-text')
                                },2500);
                            } else if (data.response){
                                $("#panel_message").removeClass('password-text')
                                response_msg = "SENHA ALTERADA"
                                $("#pin-controls").attr("request_permission",'first_registration')
                                setTimeout(function () {
                                    $('#panel_message').text('')
                                    pin =""
                                    $('#panel_message').removeClass('animated flash');
                                    $("#panel_message").addClass('password-text')
                                },2500);

                            }else{
                                $("#panel_message").removeClass('password-text')
                                response_msg = "SENHA NÃO ATUALIZADA"
                                $("#pin-controls").attr("request_permission",'first_registration')
                                control_timeout =  setTimeout(function () {
                                    $("#panel_message").removeAttr("value",'blocked_keyboard')
                                    $('#panel_message').text('')
                                    pin =""
                                    $('#panel_message').removeClass('animated flash');
                                    $("#panel_message").addClass('password-text')
                                }, control_time)
                            }
                            $('#panel_message').removeClass('blink');
                            $("#panel_message").text(response_msg)
                            $('#panel_message').removeClass('animated flash').addClass('animated flash').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function () {
                                $('#panel_message').removeClass('animated flash');
                                setTimeout(function () {
                                    $("#panel_message").text("")
                                }, 1000)
                            });
                        }
                    });
                }
                else if(jQuery.inArray(pin , pin_control) != -1) {
                    $("#panel_message").text("SENHA JÁ UTILIZADA")
                    control_timeout =  setTimeout(function () {
                        $("#panel_message").text("")
                    }, control_time)
                    pin = ""
                    $("#panel_message").removeClass('password-text')
                }else {
                    // confirm_auth()
                    setTimeout(function () {
                        $.ajax({
                            type: 'POST',
                            url: '/controls/confirm_password/',
                            data: {'pin': pin ,'system': type_system,"dupla":dupla,"pin_control":pin_control,"accessibility_port":accessibility_port,"request_permission":request_permission},
                            datatype: "json",
                            success: function (data) {
                                console.log(data)
                                if (data.pass == "OFFLINE"){
                                    $("#panel_message").removeClass('password-text');
                                    var audio_allow = document.getElementById("audio_allow");
                                    audio_allow.play();
                                    $("#panel_message").removeAttr("value",'blocked_keyboard');
                                    $("#panel_message").text("ACESSO GARANTIDO");
                                    $("#pin-controls").attr("request_permission",'false')
                                    $("body").trigger("mousemove");
                                    control_access_user = 1;
                                    dupla = "";
                                    pin=""
                                    pin_control = [];
                                    access_granted = true;
                                    control_timeout = setTimeout(function() {
                                        blocked = false;
                                        $('#panel_message').removeClass('flash');
                                        $("#panel_message").text("");
                                        $("#panel_message").addClass('password-text');
                                        picam_remove()
                                    }, control_time)
                                }else if(data.pass == "correctAccessibility"){
                                    $("#panel_message").text("CONFIRMANDO SENHA")
                                    $("#panel_message").removeClass('password-text')
                                    $('#entersomething').attr('accessibility_port','false')
                                    setTimeout(function () {
                                        var audio_allow = document.getElementById("audio_allow");
                                        audio_allow.play();
                                        $("#panel_message").removeAttr("value",'blocked_keyboard')
                                        $("#panel_message").text("ACESSO GARANTIDO")
                                        $("#pin-controls").attr("request_permission",'false')
                                        $('#entersomething').attr('accessibility_port','false')
                                    }, 1000)
                                    control_timeout = setTimeout(function() {
                                        blocked = false;
                                        $('#panel_message').removeClass('flash');
                                        $("#panel_message").text("");
                                        $("#panel_message").text("")
                                        pin=""
                                        $("#panel_message").addClass('password-text');
                                        picam_remove()
                                    }, control_time)

                                }else if(data.pass == "correctPass"){
                                    
                                    if(type_system == "SmartAccess"){
                                        $("#panel_message").text("POSICIONE SUA FACE")
                                        $("#pin-controls").attr("request_permission",'true')
                                        if(size_smart < 600){
                                            $('#recognze_eyes').removeClass('hide')
                                            $('.pin_controls_capture').hide()
                                            $(".pin_controls_capture").addClass('hide')
                                            $('.display-capture-img').removeClass('hide')                                   
                                        }
                                        $("#panel_message").removeClass('password-text')
                                        setTimeout(function(){
                                            confirm_auth()
                                        }, 1000)         
                                    }else{
                                        $("#panel_message").addClass('password-text')
                                        confirm_auth()
                                    }
                                }else if(data.access == "accessDenied"){
                                    // $('#entersomething').removeAttr("accessibility_port")
                                    $("#pin-controls").attr("request_permission",'false')
                                    $("#panel_message").removeClass('password-text')
                                    $("#panel_message").text("ACESSO NEGADO")
                                    var audio_denied = document.getElementById("audio_denied");
                                    audio_denied.play();
                                    control_timeout = setTimeout(function() {
                                        $("#panel_message").removeAttr("value",'blocked_keyboard')
                                        $('#panel_message').text('')
                                        pin =""
                                    }, control_time)

                                }else{
                                    $("#panel_message").removeClass('password-text')
                                    $("#panel_message").text("SENHA INCORRETA")
                                    $('#entersomething').attr('accessibility_port','false')

                                    control_timeout = setTimeout(function() {
                                        $("#panel_message").removeAttr("value",'blocked_keyboard')
                                        $('#panel_message').text('')
                                        pin =""
                                    }, control_time)
                                }
                            }
                        });
                    }, 1000);
                }
            } else {
                if (keyboard == "backspace") { // Apaga o ultimo pin digitado
                    pin = pin.replace('backspace', '').slice(0, -1)// Retira a string backspace da variavel pin
                    asterisk = asterisk.slice(0, -2)
                } else if (keyboard == "enter"){
                    pin = pin.replace('enter', '')
                }
                $("#panel_message").text(asterisk)
            }
        }
    })

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

    $.ajaxSetup({
        beforeSend: function (xhr, settings) {
            xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
        }
    });

});