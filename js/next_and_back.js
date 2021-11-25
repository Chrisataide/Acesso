function next_back(){

  $('.voltar-pt').click(function(){
    $('.init-smartbox').show();
    $('.select-type-language').show();
    $('.home-index').show();
    $('.welcome-language').addClass('hide')
    $('.select-type-language').removeClass('hide')
    $('.container-language').addClass('hide')
    $('.content-language').addClass('hide')
    $('.atk-3000').addClass('hide')
    // $('.home-index').addClass('hide')
    $(".home-index").css("display","none");
    $('.index_controls').removeClass('hide')
  });

  $('.init-smartbox').click(function(){
    $('.select-type-language').removeClass('hide')
  });

  // $('.back-home').click(function(event) {
  //   $('.home-index').removeClass('hide')
  //   $('.index_controls').addClass('hide')
  //   pin = ''
  //   $('#panel_message').text('')
  // });

  $('#access_pin').click(function(event) {
    $('.home-index').addClass('hide')
    $('.index_controls').removeClass('hide')
    $('#panel_message').removeClass('flash')
    $('#panel_message').removeClass('animated')
    $("#panel_message").addClass('password-text')
    $("#panel_message").text("")
  });

  $('#intercom_pin').click(function(event) {
    $('.home-index').addClass('hide')
    $('.intercom-list_users').removeClass('hide')
  });

  $('#intellibox_pin').click(function(event) {
    // $('#panel_message').text('')
    if(time_access){
      $('.home-index').addClass('hide')
      $('.index_controls').addClass('hide')
      $('.intellibox_pin').removeClass('hide')    
    }else{
      $('.home-index').addClass('hide')
      $('.index_controls').removeClass('hide')  
    }
  });

  $('#alarm_pin').click(function(event) {
    $("#panel_message").text("")
    $('#panel_message').removeClass('animated')
    $("#panel_message").addClass('password-text')
    if(time_access){
      $('.home-index').addClass('hide')
      $('.index_controls').addClass('hide')  
      $('.arm_desarm_frame').removeClass('hide')
    }else{    
      $('.home-index').addClass('hide')
      $('.index_controls').removeClass('hide')
    }
  });

  $('#cctv_pin').click(function(event) {
    $('#panel_message').removeClass('animated')
    $("#panel_message").addClass('password-text')
    $('#panel_message').text('')
    if(time_access){
      $('.home-index').addClass('hide')
      $('.index_controls').addClass('hide')  
      $('.cctv_camera').removeClass('hide')
    }else{    
      $('.home-index').addClass('hide')
      $('.index_controls').removeClass('hide')
    }
  });
}