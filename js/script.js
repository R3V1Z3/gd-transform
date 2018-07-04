var default_transform;
var eid_inner = '.inner';
var svg_filter;

const gd = new GitDown('#wrapper', {
    title: 'Transform',
    content: 'README.md',
    merge_gists: true,
    callback: done
});

const eid = gd.eid;
let timeout;
let events_registered = false;

function done() {

    if ( !gd.status.has('theme-changed') ) {
        var x = $('.info .slider.offsetX input').val();
        var y = $('.info .slider.offsetY input').val();
        $(eid_inner).attr( 'data-x' , x );
        $(eid_inner).attr( 'data-y' , y );
    }

    if ( gd.status.has('theme-changed') ) {
        // first update fields based on cssvar defaults
        gd.update_from_params();
    }

    if ( !events_registered ) register_events();
    center_view();
}

function update_slider_value( name, value ) {
    var slider = document.querySelector( `.info .slider.${name} input` );
    slider.value = value;
    slider.setAttribute( 'value', value );
}

// center view by updating translatex and translatey
function center_view() {
    const $ = document.querySelector.bind(document);
    const inner = $('.inner');
    const current = $('.section.current');
    let padding = parseInt( $('.field.padding input').value );
    console.log(padding);
    // configure object to store properties
    const s = {
        x: current.offsetLeft,
        y: current.offsetTop,
        width: current.offsetWidth,
        height: current.offsetHeight
    };
    const maxwidth = window.innerWidth;
    const maxheight = window.innerHeight;

        // scale accounts for whichever is less, width or heigth
        let scale = Math.min(
            maxwidth / (s.width + padding),
            maxheight / (s.height + padding)
        );
        // setup positions for transform
        let x = s.x - (maxwidth - s.width) / 2;
        let y = s.y - (maxheight - s.height) / 2;

        x -= parseInt( $('.field.offsetX input').value );
        y -= parseInt( $('.field.offsetY input').value );

        // initiate transform
        const transform = `
            perspective(${$('.field.perspective input').value}px)
            rotateX(${$('.field.rotateX input').value}deg)
            rotateY(${$('.field.rotateY input').value}deg)
            rotateZ(${$('.field.rotateZ input').value}deg)
            translateX(-${x}px)
            translateY(-${y}px)
            translateZ(${$('.field.translateZ input').value}px)
            scaleZ(${$('.field.scaleZ input').value})
            scale(${scale})
            `;
        inner.style.transform = transform;
}

function register_events() {

    events_registered = true;

    window.addEventListener('resize', function(event){
        center_view();
    });

    // padding
    $('.info .collapsible.perspective .field.slider input').on('input change', function(e) {
        center_view();
    });

    $('.info .collapsible.dimensions .field.slider input').on('input change', function(e) {
        center_view();
    });

    // mousewheel zoom handler
    $('.inner').on('wheel', function(e){
        // disallow zoom within parchment content so user can safely scroll text
        let translatez = document.querySelector('.info .slider.translateZ input');
        if ( translatez === null ) return;
        var v = Number( translatez.value );
        if( e.originalEvent.deltaY < 0 ) {
            v += 10;
            if ( v > 500 ) v = 500;
        } else{
            v -= 10;
            if ( v < -500 ) v = -500;
        }
        gd.settings.set_value('translateZ', v);
        gd.update_field(translatez, v);
        center_view();
    });

    interact(eid_inner)
    .gesturable({
        onmove: function (event) {
            var $translatez = $('.info .slider.translatez input');
            var scale = Number( $translatez.val() );
            scale = scale * (5 + event.ds);
            // update inner with new scale
            update_slider_value( 'translateZ', scale );
            $translatez.change();
            dragMoveListener(event);
        }
    })
    .draggable({ onmove: dragMoveListener });

    // LEFT and RIGHT arrows
    document.addEventListener('keyup', e => {
        var key = e.key;
        if ( key === 'ArrowLeft' ) {
            var $prev = $('.toc a.current').prev()[0];
            if (typeof $prev === "undefined") {
                $('.toc a:last-child')[0].click();
            } else $prev.click();
        } else if ( key === 'ArrowRight' ) {
            var $next = $('.toc a.current').next()[0];
            if (typeof $next === "undefined") {
                $('.toc a:first-child')[0].click();
            } else $next.click();
        }
        }, false);
}

function dragMoveListener (event) {
    var target = event.target;
    var x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
    var y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
    
    if ( target.classList.contains('inner') ) {
        update_slider_value( 'offsetX', x );
        update_slider_value( 'offsetY', y );
        var $offsetX = $('.info .slider.offsetX input');
        var $offsetY = $('.info .slider.offsetY input');
        $offsetX.change();
        $offsetY.change();
        center_view();
    }
    
    // update the position attributes
    target.setAttribute('data-x', x);
    target.setAttribute('data-y', y);
}
