function confirmMsg(confirm_msg, callFunction, args) {
    /* Por padrao:
    * confirm_msg é a mensagem de confirmacao
    * callFunction é a função a ser chamada
    * args são os argumentos que serao passados para a funcao a ser chamada*/
    $('div.confirm-msg .panel-default').removeClass('animated bounceOut');
    $('div.confirm-msg .panel-default').addClass('animated bounceIn');
    $("div.confirm-msg").show()
    $("div.confirm-msg .confirm-text").text(confirm_msg)

    // Function off() para chamar a funcao apenas uma vez quando cancelada
    $("div.confirm-msg").off().one('click','.confirm-btn-cancel',function(e){
        $("div.confirm-msg ").hide()
        $("div.confirm-msg .confirm-text").text()
        // $('div.confirm-msg .panel-default').removeClass('animated bounceOut');
        // $('div.confirm-msg .panel-default').addClass('animated bounceOut');
        // setTimeout(function () {
        //     $("div.confirm-msg ").hide()
        //     $("div.confirm-msg .confirm-text").text()
        // }, 600)
    });

    $("div.confirm-msg").one('click','.confirm-btn-ok',function(e){
        $("div.confirm-msg ").hide()
        $("div.confirm-msg .confirm-text").text()
        callFunction(args)
    });

    $(document).mouseup(function (e)
    {
        var container = $("div.confirm-msg .panel-default");

        if (!container.is(e.target) // if the target of the click isn't the container...
            && container.has(e.target).length === 0) // ... nor a descendant of the container
        {
            $('div.confirm-msg .panel-default').removeClass('animated bounceOut bounceIn shake').addClass('animated shake').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
                $('div.confirm-msg .panel-default').removeClass('animated bounceOut bounceIn shake');
            });
        }
    });
}


$(document).on('click','#location_1, #location_2, #location_3, #location_4, #all_location',function(e){
    var o = $(this);
    var text = o.find('span').text();
    var location = o.find('h3').text();
    var msg = location.replace('(DESARMADO)', '').replace('(ARMADO)', '');
    var partition = o.attr('id').split('_')[1];
    var status = "";

    var url = window.location.href
    var user_id = url.split('user_id=')[1]

    switch (text){
        case '(ARMADO)':
            msg = "DESARMAR " + msg + "?";
            status = "disarm";
            break;
        case '(DESARMADO)':
            msg = "ARMAR " + msg + "?";
            status = "arm";
            break;
        default:
            msg = "TODOS OS AMBIENTES";
    }

    let partition_int = parseInt(partition);

    if (status != 'arm' || jQuery.isEmptyObject(data_alarms[partition_int])){
        confirmMsg(msg, alarm.set_partition, [partition, status, user_id]);
    } else {
        let name_partition = '';
        switch (partition){
            case '1':
                name_partition = 'AGÊNCIA';
                break;
            case '2':
                name_partition = 'HALL-AUTO-ATENDIMENTO';
                break;
            case '3':
                name_partition = 'RETAGUARDA';
                break;
            default:
                name_partition = 'TESOURARIA';
        }
        $('#title_modal_partition').text('(' + name_partition + ')');
        $('#id_partition_modal_open').val(partition);
        $('#alarmed_partitions').modal('show');
    }
});

$(document).on('click','#button_arm_modal',function(e){
    // let partition = $('#id_partition_modal_open').val();
    // alarm.set_partition([partition, 'arm'])
    $('#alarmed_partitions').modal('hide');
});

$(document).on('click','#back',function(e){
   window.location.replace("http://127.0.0.1:3333/?type_system=SmartAccess")
});
