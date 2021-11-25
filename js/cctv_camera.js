var count_img_popup = 0;
var carousel = "";
var _urlUpdateStatus = '#'
var updateDate = '';
var timeCarousel = 10000;
var action = 0
var id_zoom = null

var pager = {
    actual: 0,
    size: 1,

    total: function() {
        let amount_cams = $('.responsive-img').length;
        return amount_cams == 0 ? 1 : amount_cams
    },
    total_pages: function() {
        return parseInt((pager.total() - 1) / pager.size) + (((pager.total() - 1) % pager.size) > 0 ? 1 : 1);
    },
    get_id: function(p) {
        return ((p - 1) * pager.size);
    },
    get_pg: function(n) {
        return $('#pg' + pager.get_id(n));
    },
    prev: function(p) {
        pager.update(p);
    },
    next: function(p) {
        pager.update(p);
    },
    update: function(p) {


        if (pager.actual > 0)
            pager.get_pg(pager.actual).hide();

        var atual_pag = pager.actual += p;
        var tot_pages = $('.responsive-img').length;

        $('.total-pag').empty()
        $('.total-pag').append(atual_pag + '/' + tot_pages)

        pager.get_pg(pager.actual).show();

        if (pager.has_prev()) {
            $('#li_pg_prev').show();
            $('.texeeet').hide();
            if ($('.width-img-cctv').hasClass('zoom')) {
                if ($(id_zoom.context).hasClass('zoom')) {
                    $('.width-img-cctv').addClass('zoom')
                } else {
                    $('.width-img-cctv').removeClass('zoom')
                }
            }
        } else {
            $('#li_pg_prev').hide();
            $('.texeeet').hide();
        }
        if (pager.has_next()) {
            $('#li_pg_next').show();
        } else {
            $('#li_pg_next').hide();
            $('.texeeet').show();
        }

        pager.text();
    },
    text: function() {
        $('#pg_num').text(pager.actual + ' / ' + pager.total_pages());
    },
    has_prev: function() {
        return pager.actual > 1;
    },
    has_next: function() {
        return pager.actual < pager.total_pages();
    },
    removePage: function() {

    },
    init: function() {
        $('#panel_cctv').children().hide()
        pager.actual = 0
        pager.update(1);
    }
};

function cctv_camera() {

    $('.fa').click(function() {
        var b = $(this)
        $('.fa').removeClass('btn-fix')
        // $(b).addClass('btn-fix')
    })


    $(function() {


        $(document).on("dragstart", function(e) {
            console.log(e.target.nodeName)
            if (e.target.nodeName.toUpperCase() == "IMG") {
                return false;
            }
        });

        $(".width-img-cctv").click(function() {
            id_zoom = $(this)
            var context = id_zoom.context
            if (!$(id_zoom.context).hasClass('zoom')) {
                $(id_zoom.context).addClass('zoom')
                $('.fa-play-circle').removeClass('btn-fix')
                $('.fa-play-circle').removeClass('fa-play')
                $('.fa-pause').addClass('btn-fix')
                $('.fa-pause').addClass('fa-pause-btn')
                $('.panel-heading').addClass('menu-zoom')
                clearTimeout(carousel);
                carousel = ""
            } else {
                $('.fa-play-circle').addClass('btn-fix')
                $('.fa-play-circle').addClass('fa-play')
                $('.fa-pause').removeClass('btn-fix')
                $('.fa-pause').removeClass('fa-pause-btn')
                carousel = setInterval(carouselCams, timeCarousel);
                $('.panel-heading').removeClass('menu-zoom')
                $(id_zoom.context).removeClass('zoom')
            }
        });

        $('#li_pg_play, #li_pg_stop').click(function(e) {

            $('li.active').removeClass('active');

            var $this = $(this);
            $this.addClass('active');
            e.preventDefault();
        });


        pager.init();
        $('#li_pg_prev a').click(function(e) {
            e.preventDefault();
            pager.prev(-1);
            if ($('.width-img-cctv').hasClass('zoom')) {
                if ($(id_zoom.context).hasClass('zoom')) {
                    $('.width-img-cctv').addClass('zoom')
                } else {
                    $('.width-img-cctv').removeClass('zoom')
                }
            }
        });
        $('#li_pg_next a').click(function(e) {
            e.preventDefault();
            pager.next(+1);
            if ($('.width-img-cctv').hasClass('zoom')) {
                if ($(id_zoom.context).hasClass('zoom')) {
                    $('.width-img-cctv').addClass('zoom')
                } else {
                    $('.width-img-cctv').removeClass('zoom')
                }
            }
        });
        $('#li_pg_stop a').click(function(e) {
            e.preventDefault();
            clearTimeout(carousel);
            carousel = ""
        });

        $('#li_pg_play a').click(function(e) {
            if (pager.total_pages() > 1) {
                e.preventDefault();
                if (!carousel)
                    carousel = setInterval(carouselCams, timeCarousel);
            }
        });

        //GN
        $('.pages_gn li').click(function(e) {
            //e.preventDefault(); pager_gn.prev(-1);
            var o = $(this);
            console.log(o)
            var id_action = o.attr('id').replace('li_', '').replace('pg_', '').split('_');
            if (id_action[0] == "next") {
                pager_gn.next(+1, parseInt(id_action[2]) + 1)
            } else {
                pager_gn.prev(-1, parseInt(id_action[2]) - 1)
            }
        });

        function carouselCams() { // Atualiza as paginas de forma randomica
            if (pager.actual == pager.total_pages()) { // Verifica se esta na ultima pagina para voltar
                pager.prev(-pager.actual + 1)
            } else {
                pager.next(+1)
            }
        }

        if (pager.total_pages() > 1) { // Somente atualiza se o total de paginas for maior que 1
            carousel = setInterval(carouselCams, timeCarousel);
        }

        if ($('.cctv_camera').hasClass('hide')) {
            // condição sem utilidade apenas para pular para o else. 
        } else {

            function startUpdateStatus() {
                setTimeout(startUpdateStatus, 5000);
                $("#cam1").attr("src", "http://192.168.2.234:8083")
                $("#cam2").attr("src", "http://192.168.2.234:8081")
            }

            startUpdateStatus();

        }
    });
}