class Transform extends GitDown {

    constructor(el, options) {
        super(el, options);
    }

    ready() {
        this.update_offsets();
        this.extract_svg('filters.svg');
        this.add_fx();
        this.vignette();

        this.center_view();
        this.register_app_events();
        this.update_slider_value( 'outer-space', this.settings.get_value('outer-space') );

        this.center_view();
    }

    extract_svg(filename) {
        let svg = document.querySelector('#svg');
        if ( svg === undefined ) return;
        let svg_filter = this.settings.get_param_value('svg-filter');
        if ( svg_filter === undefined ) svg_filter = 'none';
        this.get(filename).then( data => {
            // add svg filters to body
            var div = document.createElement("div");
            div.id = 'svg';
            div.innerHTML = data;
            document.body.insertBefore(div, document.body.childNodes[0]);
    
            let select = this.wrapper.querySelector('.nav .select.svg-filter select');
            if ( select !== null ) {
                let filters = document.querySelectorAll('#svg defs filter');
                filters.forEach( i => {
                    var id = i.getAttribute('id');
                    var name = i.getAttribute('inkscape:label');
                    select.innerHTML += `<option>${name}-${id}</option>`;
                });
            }
            select.value = svg_filter;
            this.update_field(select, svg_filter);
            this.svg_change();
        }).catch(function (error) {
            console.log(error);
        });
    }

    add_fx() {
        // check if fx layer already exists and return if so
        if ( this.wrapper.querySelector('.fx') === undefined ) return;
        const fx = document.createElement('div');
        fx.classList.add('fx');
        // wrap inner div with fx div
        const inner = document.querySelector(this.eid_inner);
        inner.parentNode.insertBefore(fx, inner);
        fx.appendChild(inner);
        // add vignette layer to wrapper
        const vignette = document.createElement('div');
        vignette.classList.add('vignette-layer');
        this.wrapper.appendChild(vignette);
    }

    svg_change() {
        let svg = this.settings.get_value('svg-filter');
        let fx = document.querySelector('.fx');
        if ( fx === null ) return;
    
        let style = `
            brightness(var(--brightness))
            contrast(var(--contrast))
            grayscale(var(--grayscale))
            hue-rotate(var(--hue-rotate))
            invert(var(--invert))
            saturate(var(--saturate))
            sepia(var(--sepia))
            blur(var(--blur))
        `;
        let url = '';
        svg = svg.split('-');
        if ( svg.length > 1 ) url = ` url(#${svg[1].trim()})`;
        style += url;
        fx.style.filter = style;
    }

    vignette() {
        const v = this.settings.get_value('vignette');
        var bg = `radial-gradient(ellipse at center,`;
        bg += `rgba(0,0,0,0) 0%,`;
        bg += `rgba(0,0,0,${v/6}) 30%,`;
        bg += `rgba(0,0,0,${v/3}) 60%,`;
        bg += `rgba(0,0,0,${v}) 100%)`;
        var s = '';
        var vignette = this.wrapper.querySelector('.vignette-layer');
        if ( vignette !== null ) vignette.style.backgroundImage = bg;
    }

    update_offsets() {
        this.inner.setAttribute( 'data-x', this.settings.get_value('offsetX') );
        this.inner.setAttribute( 'data-y', this.settings.get_value('offsetY') );
    }

    update_slider_value( name, value ) {
        var slider = this.wrapper.querySelector( `.nav .slider.${name} input` );
        slider.value = value;
        this.update_field(slider, value);
    }

    // center view by updating translatex and translatey
    center_view() {
        const $ = document.querySelector.bind(document);
        let $s = $('.section.current');
        let $fx = $('.fx');
        let $inner = $('.inner');
        
        // store $inner dimensions for use later, if not already set
        if( $inner.getAttribute('data-width') === null ) {
            $inner.setAttribute('data-width', $inner.offsetWidth);
            $inner.setAttribute('data-height', $inner.offsetHeight);
        }

        let inner_space = parseInt( $('.field.inner-space input').value );
        let outer_space = parseInt( $('.field.outer-space input').value );

        const maxw = window.innerWidth;
        const maxh = window.innerHeight;

        // start by setting the scale
        let scale = Math.min(
            maxw / ( $s.offsetWidth + inner_space ),
            maxh / ( $s.offsetHeight + inner_space )
        );

        // setup positions for transform
        let x = $s.offsetLeft - ( maxw - $s.offsetWidth ) / 2;
        let y = $s.offsetTop - ( maxh - $s.offsetHeight ) / 2;

        x -= parseInt( $('.field.offsetX input').value );
        y -= parseInt( $('.field.offsetY input').value );

        // initiate transform
        const transform = `
            translateX(${-x}px)
            translateY(${-y}px)
            scale(${scale})
        `;
        let w = Number($inner.getAttribute('data-width'));
        let h = Number($inner.getAttribute('data-height'));
        $inner.style.width = w + outer_space + 'px';
        $inner.style.height = h + outer_space + 'px';
        $fx.style.width = $inner.offsetWidth + 'px';
        $fx.style.height = $inner.offsetHeight + 'px';
        $fx.style.transform = transform;
    }

    register_app_events() {

        if ( this.status.has('app-events-registered') ) return;
        else this.status.add('app-events-registered');
    
        window.addEventListener('resize', e => {
            this.center_view();
        });
    
        this.events.add('.nav .collapsible.Effects .field.slider input', 'input', this.center_view);
        this.events.add('.nav .collapsible.Dimensions .field.slider input', 'input', this.center_view);
        this.events.add('.nav .field.slider.fontsize input', 'input', this.center_view);
        this.events.add('.nav .field.slider.vignette input', 'input', this.vignette.bind(this));
    
        let f = document.querySelector('.nav .field.select.svg-filter select');
        f.addEventListener( 'change', this.svg_change );
    
        // mousewheel zoom handler
        this.events.add('.inner', 'wheel', e => {
            // disallow zoom within parchment content so user can safely scroll text
            let translatez = document.querySelector('.nav .slider.translateZ input');
            if ( translatez === null ) return;
            var v = Number( translatez.value );
            if( e.deltaY < 0 ) {
                v += 10;
                if ( v > 500 ) v = 500;
            } else{
                v -= 10;
                if ( v < -500 ) v = -500;
            }
            this.settings.set_value('translateZ', v);
            this.update_slider_value( 'translateZ', v );
        }, this );
    
        interact(this.eid_inner)
        .gesturable({
            onmove: function (event) {
                var scale = this.settings.get_value('translateZ');
                scale = scale * (5 + event.ds);
                this.update_slider_value( 'translateZ', scale );
                this.dragMoveListener(event);
            }
        })
        .draggable({ onmove: this.dragMoveListener.bind(this) });
    
    }
    
    dragMoveListener (event) {
        let target = event.target;
        if ( !target.classList.contains('inner') ) return;
        if ( event.buttons > 1 && event.buttons < 4 ) return;
        let x = (parseFloat(target.getAttribute('data-x')) || 0);
        let old_x = x;
        x += event.dx;
        let y = (parseFloat(target.getAttribute('data-y')) || 0);
        let old_y = y;
        y += event.dy;
    
        // when middle mouse clicked and no movement, reset offset positions
        if ( event.buttons === 4 ) {
            x = this.settings.get_default('offsetX');
            y = this.settings.get_default('offsetY');
        }
        
        this.update_slider_value( 'offsetX', x );
        this.update_slider_value( 'offsetY', y );
        
        // update the position attributes
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
    
        this.center_view();
    }

}