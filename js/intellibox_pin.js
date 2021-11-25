function CreateGn() {
    function msgLoader() {
        $('#msg_gn').addClass('blink');
        var msg_gn = "CARREGANDO . .";
        document.getElementById('msg_gn').innerHTML = msg_gn;

        var LoaderFrame = $('<div class="loader"></div>')

        $('.display-access-gn').append(LoaderFrame)
    }

    msgLoader()

    // $(function() {
    //     function CreateFrame() {
    //         $('.loader').remove()
    //         $('#msg_gn').remove()
    //         var createFrame = $('<iframe id="iframe-intellibox" class="gerador-iframe" name="ifrm" width="100%" height="293" id="ifrm" src="https://atk3000.alarmtek.com.br/terminal/bloquinho/1" frameborder="0"></iframe>')
    //         $('.display-gerador-neblina').append(createFrame)
    //     };
    //
    //
    //     setTimeout(function() {
    //         CreateFrame()
    //     }, 5000);
    // });
}