function bb(){

    $(document).ready(function(e){
        $(document).on('click', '.list-users a', function(e){
            console.log($(this))
            var id = $(this).attr('id');
            console.log(id)
            var id_user = parseInt(id)
            $('#msg').addClass('blink');
            var msg = "REALIZANDO CHAMADA..";
            document.getElementById('msg').innerHTML = msg;
            $.ajax({
                // url: "http://192.168.2.44:3003/call_user?id="+id,
                // type:'POST',
                url:"{% url 'intercom-get-call' %}",
                data: { 'id_user': id_user },
                success: function(data){
                    if (data.success == 0){
                        $('#msg').addClass('blink');
                        var msg = "SEM RESPOSTA . .";
                        document.getElementById('msg').innerHTML = msg;

                    } else if (data.success == 1){

                        var createFrame = $('<iframe id="iframeteste" class="hide frame-active" width="400" height="250" src="https://atk3000.alartek.com.br:5061/demos/demo_audio_only.html" allow="microphone"></iframe>')

                        var micro = $(
                           '<div class="object">'+
                              '<div class="outline">'+
                              '</div>'+
                              '<div class="outline" id="delayed">'+
                              '</div>'+
                              '<div class="button">'+
                              '</div>'+
                              '<div class="button button-micro" id="circlein">'+
                              '<i class="fa fa-microphone micro-size"></i>'+
                              '</div>'+
                           '</div>'
                        )

                        if ($('#iframeteste').hasClass('frame-active')) {
                            // $(this).hide();
                            console.log('passei batido igual bala')
                        }else{
                            $('.micro').append(createFrame)
                            $('.micro').append(micro)
                            $('.micro').addClass('micro-on')
                        }



                        $('#msg').addClass('blink');
                        var msg = "CHAMADA EM ANDAMENTO..";
                        document.getElementById('msg').innerHTML = msg;
                    
                    } else if (data.success == 2){
                        
                        var msg = "NÃO ATENDIDA";
                        document.getElementById('msg').innerHTML = msg;
                    }
                console.log(data)
                }
            });


        });
           
        function x(){
            var x = $('.list-users').children().length
            console.log(x)
            if(x == 0){
                $('#msg').addClass('blink');
                var msg = "CARREGANDO USUÁRIOS . .";
                $('#msg').text(msg)
            }else{
                console.log('testando o empty')
                $('#msg').empty();
            }

            setTimeout(function(){
                $(window).on("load", getUsers);
                var users = setInterval(getUsers, 3000);
                    function getUsers(){
                        $.get("{% url 'intercom-getuser' %}",
                            function(data) {
                                $('.list-users').children().remove();
                                Object.keys(data).map(function(value, index){
                                    // $('#msg').empty();
                                    $('.list-users').append(
                                        '<a href="#" id="'+value+'" style="color:white" class="call">'+
                                        '<div class="name-user">'+data[value]["NAME"]+'</div>'+
                                        '</a>'
                                        )
                                }); 
                            }
                        );
                    } 
            }, 2000);

            setTimeout(function(){
                $('#msg').empty();
                $('#msg').removeClass('blink');
                var msg = "USUÁRIOS ONLINE";
                $('#msg').text(msg)
            }, 5000);
        };

        x();
    
    });

    $('#img_home').click(function (e) {
        window.location.replace("/")
    })
};
