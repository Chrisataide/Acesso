function config_smartbox(){

  var id_language = ""

  $('.language-text').click(function(){
    $('.container-language').addClass('hide')
    $('.language-text').removeClass('active-language')
    var language_val = $(this)
    $(language_val).addClass('active-language')    
    id_language = language_val.attr('id')

    switch (id_language){

      case '1':
        $('.type-langue').text('Language')
        $('.change-english').text('English')
        $('.change-portugues').text('Portuguese - Brazil')
        $('.change-portugal').text('Portuguese - Portugal')
        $('.change-spanish').text('Spanish')
        $('.change-german').text('German')
        $('.change-french').text('French')
        $('.change-danish').text('Danish')
        break;
      
      case '2':
        $('.type-langue').text('Idioma')
        $('.change-portugues').text('Português - Brasil')
        $('.change-english').text('Inglês')
        $('.change-portugal').text('Português - Portugal')
        $('.change-spanish').text('Espanhol')
        $('.change-german').text('Alemão')
        $('.change-french').text('Francês')
        $('.change-danish').text('Dinamarquês')
        break;

      case '3':
        $('.type-langue').text('Idioma')
        $('.change-portugues').text('Portuguese - Brasil')
        $('.change-english').text('Inglês')
        $('.change-portugal').text('Português - Portugal')
        $('.change-spanish').text('Espanhol')
        $('.change-german').text('Alemão')
        $('.change-french').text('Francês')
        $('.change-danish').text('Dinamarquês')
        break;

      case '4':
        $('.type-langue').text('Idioma')
        $('.change-spanish').text('Español')
        $('.change-english').text('Inglés')
        $('.change-portugues').text('Portugués - Brasil')
        $('.change-portugal').text('Portugués - Portugal')
        $('.change-german').text('Alemán')
        $('.change-french').text('Francés')
        $('.change-danish').text('Danés')
        break;

      case '5':
        $('.type-langue').text('Sprache')
        $('.change-english').text('Englisch')
        $('.change-portugues').text('Portugiesisch - Brasilien')
        $('.change-portugal').text('Portugiesisch - Portugal')
        $('.change-spanish').text('Spanisch')
        $('.change-german').text('Deutsche')
        $('.change-french').text('Französisch')
        $('.change-danish').text('Dänisch')
        break;

      case '6':
        $('.type-langue').text('la langue')
        $('.change-english').text('Anglais')
        $('.change-portugues').text('Portugais - Brésil')
        $('.change-portugal').text('Portugais - Portugal')
        $('.change-spanish').text('Espanol')
        $('.change-german').text('Allemand')
        $('.change-french').text('Français')
        $('.change-danish').text('Danois')
        break;

      case '7':
        $('.type-langue').text('Sprog')
        $('.change-english').text('Engelsk')
        $('.change-portugues').text('Portugisisk - Brasilien')
        $('.change-portugal').text('Portugisisk - Portugal')
        $('.change-spanish').text('Spansk')
        $('.change-german').text('Tysk')
        $('.change-french').text('Fransk')
        $('.change-danish').text('Dansk')
        break; 
    }
  });

  $(".next-language").click(function(){
    $('.init-smartbox').hide();
    $('.select-type-language').hide();
    $('.home-index').hide();
    $('.index_controls').addClass('hide')
    if ($('.language-text').hasClass('active-language')) {
      console.log(id_language)
      // var id_language = $('.container-language').attr('id')
      // console.log(id_language)
      
      switch (id_language){

        case '1':
          $('.welcome-language').removeClass('hide')
          $('.content-language').removeClass('hide')
          $('.atk-3000').removeClass('hide')
          $('.language-en').removeClass('hide')
          var audio_english = document.getElementById("audio_english");
          audio_english.play();
          break;
        
        case '2':
          $('.atk-3000').addClass('hide')
          $('.language-pt').removeClass('hide')
          $('.welcome-language').removeClass('hide')
          $('.content-language').removeClass('hide')
          var audio_pt_br = document.getElementById("audio_pt_br");
          audio_pt_br.play();
          break;
        
        case '3':
          $('.welcome-language').removeClass('hide')
          $('.content-language').removeClass('hide')
          $('.language-pt').removeClass('hide')
          $('.atk-3000').addClass('hide')
          var audio_portugal = document.getElementById("audio_portugal");
          audio_portugal.play();
          break;
        
        case '4':
          $('.atk-3000').addClass('hide')
          $('.welcome-language').removeClass('hide')
          $('.content-language').removeClass('hide')
          $('.language-es').removeClass('hide')
          var audio_espanhol = document.getElementById("audio_espanhol");
          audio_espanhol.play();
          break;
        
        case '5':
          $('.atk-3000').addClass('hide')
          $('.welcome-language').removeClass('hide')
          $('.content-language').removeClass('hide')
          $('.language-ale').removeClass('hide')
          var audio_alemao = document.getElementById("audio_deutsch");
          audio_alemao.play();
          break;    
        
        case '6':
          $('.atk-3000').addClass('hide')
          $('.welcome-language').removeClass('hide')
          $('.content-language').removeClass('hide')
          $('.language-fr').removeClass('hide')
          var audio_frances = document.getElementById("audio_frances");
          audio_frances.play();
          break; 
        
        case '7':
          $('.atk-3000').addClass('hide')
          $('.welcome-language').removeClass('hide')
          $('.content-language').removeClass('hide')
          $('.language-dina').removeClass('hide')
          var audio_dansk = document.getElementById("audio_dansk");
          audio_dansk.play();
          break; 
      }
    }
  });
}

// var url = 'smart/configuration'
//
// function done_config() {
//     $.ajax({
//         type: 'GET',
//         url: url,
//         data: {},
//         dataType: 'json',
//         success: function(data) {
//             if(data.response == true){
//                 $('.welcome-smartbox-config').addClass('hide')
//                 $('.welcome-language').addClass('hide')
//                 $('.index_controls').hide()
//                 $('body').removeClass('no-screen-sleep')
//                 $('.welcome-bradesco').removeClass('hide')
//                 welcome_bank()
//                 clearInterval(interval_config)
//             }else{
//                 // $("body").trigger("mousemove");
//                 $('.welcome-bradesco').addClass('hide')
//                 $('body').addClass('no-screen-sleep')
//                 $(".home-index").css("display","none");
//                 $('.welcome-smartbox-config').removeClass('hide')
//                 if($('.language-en').hasClass('hide') && $('.language-pt').hasClass('hide') &&
//                     $('.language-es').hasClass('hide') && $('.language-ale').hasClass('hide') &&
//                     $('.language-fr').hasClass('hide') && $('.language-dina').hasClass('hide')){
//                     $('.index_controls').removeClass('hide')
//                 }else{
//                     $('.index_controls').addClass('hide')
//                 }
//                 console.log('AutoDefesa ATK3000 não configurado')
//             }
//         }
//     });
// }
//
//
//
// var interval_config = setInterval(function() {done_config()}, 5000);
//
// done_config()