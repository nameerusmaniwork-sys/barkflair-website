/* BarkFlair site script */
/* ===== SCROLL 3D ANIMATIONS (vanilla JS, Intersection Observer) ===== */
(function(){
  var root=document.documentElement;
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!('IntersectionObserver' in window)){root.classList.remove('anim-ready');return;}
  root.classList.add('anim-ready');
  if(reduce)root.classList.add('calm'); // motion turned down on this device: soft fades, no 3D movement

  // split .split-words headings into word spans
  document.querySelectorAll('.split-words').forEach(function(h){
    var n=0,start=parseFloat(h.getAttribute('data-delay'))||0;
    (function wrap(node){
      Array.prototype.slice.call(node.childNodes).forEach(function(c){
        if(c.nodeType===3){
          var frag=document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function(part){
            if(!part)return;
            if(/^\s+$/.test(part)){frag.appendChild(document.createTextNode(part));return;}
            var w=document.createElement('span');w.className='word';w.textContent=part;
            w.style.animationDelay=(start+n++*0.055).toFixed(3)+'s';frag.appendChild(w);
          });
          node.replaceChild(frag,c);
        }else if(c.nodeType===1&&!c.classList.contains('word')){wrap(c);}
      });
    })(h);
  });

  // stagger: children of .stagger get increasing delays
  document.querySelectorAll('.stagger').forEach(function(parent){
    var step=parseFloat(parent.getAttribute('data-stagger'))||0.09,i=0;
    Array.prototype.forEach.call(parent.children,function(child){
      if(child.classList.contains('reveal')&&!/\bdelay-\d/.test(child.className)){
        child.style.animationDelay=(Math.min(i,7)*step).toFixed(2)+'s';i++;
      }
    });
  });

  // true = animations replay each time you scroll back down to them; false = only the first time
  var REPLAY=true;
  function keepWatching(el){return REPLAY||el.classList.contains('repeat');}



  // VIDEO TESTIMONIALS: put a file path or link in data-video on each .vid-frame
  //   your hosting:  data-video="videos/client1.mp4"   (optional thumbnail: data-poster="images/client1.jpg")
  //   YouTube:       data-video="https://youtube.com/shorts/XXXX"  or a normal YouTube link
  //   Google Drive:  data-video="https://drive.google.com/file/d/XXXX/view"  (file shared as "Anyone with the link")

  // ===== BarkFlair native player for Bunny Stream videos (no branding) =====
  var ICON_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m22 9-6 6M16 9l6 6"/></svg>';
  var ICON_ON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  var BFDEBUG=/videodebug/.test(location.hash);
  function dbg(el,msg){if(!BFDEBUG||!el)return;var d=el.querySelector('.bf-dbg');if(!d){d=document.createElement('span');d.className='bf-dbg';el.appendChild(d);}d.textContent=msg;}
  var hlsWait=null;
  function loadHlsLib(cb){
    if(window.Hls)return cb(true);
    if(hlsWait){hlsWait.push(cb);return;}
    hlsWait=[cb];var sc=document.createElement('script');sc.src='/assets/hls.light.min.js';
    sc.onload=function(){var c=hlsWait;hlsWait=null;c.forEach(function(f){f(true);});};
    sc.onerror=function(){var c=hlsWait;hlsWait=null;c.forEach(function(f){f(false);});};
    document.head.appendChild(sc);
  }
  var bfIO=('IntersectionObserver' in window)?new IntersectionObserver(function(es){
    es.forEach(function(en){var v=en.target;
      if(en.isIntersecting)v.__start(); // start loading as soon as it comes into view
      if(en.isIntersecting&&en.intersectionRatio>=0.5){v.__want=true;v.__play();}
      else if(!en.isIntersecting||en.intersectionRatio<0.25){v.__want=false;v.pause();if(!v.muted&&v.__mute)v.__mute();}
    });
  },{threshold:[0,0.25,0.5]}):null;
  document.addEventListener('touchend',function(){document.querySelectorAll('.bf-player video').forEach(function(o){if(o.__want&&o.paused&&o.__play)o.__play();});},{passive:true});
  function bfEmbed(frame,bn){
    var f=document.createElement('iframe');
    f.src='https://player.mediadelivery.net/embed/'+bn[1]+'/'+bn[2]+'?autoplay=true&muted=true&loop=true&preload=true&responsive=true&playsinline=true';
    f.setAttribute('allow','autoplay; encrypted-media; picture-in-picture; fullscreen');f.setAttribute('allowfullscreen','');f.title='Portfolio video';
    frame.innerHTML='';frame.appendChild(f);frame.classList.add('has-video');frame.classList.remove('tilt');
    dbg(frame,'Bunny embed player: direct video files could not be loaded');
  }
  function bfPlayer(frame,base,bn){
    if(!base){bfEmbed(frame,bn);return;}
    var wrap=document.createElement('div');wrap.className='bf-player';
    var v=document.createElement('video');
    v.muted=true;v.defaultMuted=true;v.setAttribute('muted','');v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');
    v.loop=true;v.preload='none';v.poster=base+'thumbnail.jpg';
    var btn=document.createElement('button');btn.type='button';btn.className='bf-sound';btn.setAttribute('aria-label','Turn sound on');btn.innerHTML=ICON_OFF;
    var hint=document.createElement('span');hint.className='bf-hint';hint.textContent='Tap for sound';
    var bar=document.createElement('i');bar.className='bf-bar';
    var big=document.createElement('span');big.className='bf-play';big.setAttribute('aria-hidden','true');
    wrap.appendChild(v);wrap.appendChild(big);wrap.appendChild(btn);wrap.appendChild(hint);wrap.appendChild(bar);
    frame.innerHTML='';frame.appendChild(wrap);frame.classList.add('has-video');frame.classList.remove('tilt');
    dbg(wrap,'BarkFlair player ready, waiting to scroll into view');
    var mode='',files=['play_720p.mp4','play_480p.mp4','play_360p.mp4','play_240p.mp4'],fi=-1,started=false,hls=null;
    function play(){var pr=v.play();if(pr&&pr.then)pr.then(function(){wrap.classList.remove('bf-blocked');},function(err){dbg(wrap,'autoplay refused by phone: '+(err&&err.name));if(err&&err.name==='NotAllowedError'&&v.paused&&v.__want)wrap.classList.add('bf-blocked');});}
    // iPhone sometimes refuses play() until the video has data: try again when it's ready
    ['loadedmetadata','canplay'].forEach(function(ev){v.addEventListener(ev,function(){if(v.__want&&v.paused&&!wrap.classList.contains('bf-blocked'))play();});});
    v.addEventListener('playing',function(){wrap.classList.remove('bf-blocked');dbg(wrap,'PLAYING via '+mode+(mode==='mp4'?' '+files[fi]:'')+(v.muted?' (muted)':' (sound on)'));});
    function nextFile(){ // MP4 fallback files, best quality first
      fi++;
      if(fi<files.length){mode='mp4';dbg(wrap,'trying MP4 '+files[fi]);v.src=base+files[fi];v.load();if(v.__want)play();}
      else if(bn){bfIO&&bfIO.unobserve(v);bfEmbed(frame,bn);}
    }
    v.addEventListener('error',function(){dbg(wrap,'load error on '+mode+' (code '+(v.error?v.error.code:'?')+')');if(mode==='native'||mode==='mp4')nextFile();});
    v.addEventListener('timeupdate',function(){if(v.duration)var sx='translate3d(0,0,2px) scaleX('+(v.currentTime/v.duration)+')';bar.style.webkitTransform=sx;bar.style.transform=sx;});
    function start(){
      if(started)return;started=true;
      var list=base+'playlist.m3u8';
      if(v.canPlayType('application/vnd.apple.mpegurl')){mode='native';dbg(wrap,'loading HLS (iPhone native)');v.src=list;v.load();if(v.__want)play();return;}
      loadHlsLib(function(ok){
        if(ok&&window.Hls&&window.Hls.isSupported()){
          mode='hls';dbg(wrap,'loading HLS (hls.js)');hls=new window.Hls({capLevelToPlayerSize:true});
          hls.on(window.Hls.Events.ERROR,function(e,d){if(d&&d.fatal){dbg(wrap,'HLS failed: '+d.details);try{hls.destroy();}catch(x){}hls=null;nextFile();}});
          hls.loadSource(list);hls.attachMedia(v);if(v.__want)play();
        }else nextFile();
      });
    }
    function sound(on){
      if(on){
        document.querySelectorAll('.bf-player').forEach(function(w){if(w!==wrap){var o=w.querySelector('video');o.muted=true;w.classList.remove('bf-on');var b=w.querySelector('.bf-sound');b.innerHTML=ICON_OFF;b.setAttribute('aria-label','Turn sound on');}});
        v.muted=false;wrap.classList.add('bf-on');btn.innerHTML=ICON_ON;btn.setAttribute('aria-label','Turn sound off');
        v.__want=true;start();play();
      }else{v.muted=true;wrap.classList.remove('bf-on');btn.innerHTML=ICON_OFF;btn.setAttribute('aria-label','Turn sound on');}
    }
    wrap.addEventListener('click',function(){sound(v.muted);});
    v.__start=start;v.__play=play;v.__mute=function(){sound(false);};
    if(bfIO)bfIO.observe(v);else start();
  }

  function loadVideo(frame,src){
    var yt=src.match(/(?:youtube\.com\/(?:shorts\/|watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
    var gd=src.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
    var el;
    // Bunny Stream: player link (mediadelivery.net) or a direct b-cdn.net link
    var bn=src.match(/mediadelivery\.net\/(?:play|embed)\/(\d+)\/([0-9a-f-]{36})/i),bbase=null;
    var bhost=String((window.BARKFLAIR_VIDEOS||{}).bunnyHost||'').trim().replace(/\/+$/,'');
    if(bn&&bhost)bbase=(/^https?:\/\//i.test(bhost)?bhost:'https://'+bhost)+'/'+bn[2]+'/';
    var bc=src.match(/^(https?:\/\/[^\/]*b-cdn\.net\/[0-9a-f-]{36}\/)/i);if(bc)bbase=bc[1];
    if(bn||bbase){bfPlayer(frame,bbase,bn);return;}
    if(yt){ // YouTube: show the thumbnail first, load the player only when someone presses play (fast pages)
      var id=yt[1],face=document.createElement('button');face.type='button';face.className='yt-facade';
      face.setAttribute('aria-label','Play video');face.style.backgroundImage='url(https://i.ytimg.com/vi/'+id+'/hqdefault.jpg)';
      face.innerHTML='<span class="play"></span>';
      face.addEventListener('click',function(){
        if(window.__ytActive&&window.__ytActive!==frame&&window.__ytActive.__reset)window.__ytActive.__reset(); // one video at a time
        var f=document.createElement('iframe');f.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0&playsinline=1&modestbranding=1';
        f.setAttribute('allow','autoplay; encrypted-media; picture-in-picture; fullscreen');f.setAttribute('allowfullscreen','');f.title='Portfolio video';
        frame.innerHTML='';frame.appendChild(f);window.__ytActive=frame;
      });
      frame.__reset=function(){loadVideo(frame,src);};
      el=face;
    }else if(gd){
      el=document.createElement('iframe');
      el.src=yt?'https://www.youtube-nocookie.com/embed/'+yt[1]+'?rel=0&playsinline=1':'https://drive.google.com/file/d/'+gd[1]+'/preview';
      el.setAttribute('allow','autoplay; encrypted-media; picture-in-picture; fullscreen');
      el.setAttribute('allowfullscreen','');el.setAttribute('loading','lazy');el.title='Client video testimonial';
    }else{
      el=document.createElement('video');
      el.controls=true;el.playsInline=true;el.preload='metadata';
      el.setAttribute('playsinline','');
      // use the thumbnail image if it exists, otherwise show the video's first frame
      var poster=(frame.getAttribute('data-poster')||'').trim();
      var setSrc=function(frameThumb){el.src=src+(frameThumb&&src.indexOf('#')<0?'#t=0.1':'');};
      if(poster){var im=new Image();im.onload=function(){el.poster=poster;setSrc(false);};im.onerror=function(){setSrc(true);};im.src=poster;}else{setSrc(true);}
      el.addEventListener('play',function(){document.querySelectorAll('.vid-frame video').forEach(function(v){if(v!==el)v.pause();});}); // one video at a time
    }
    // if a file on your hosting is missing, switch to the backup link (data-fallback) automatically
    var fb=(frame.getAttribute('data-fallback')||'').trim();
    if(el.tagName==='VIDEO'&&fb&&fb!==src){el.addEventListener('error',function(){loadVideo(frame,fb);},{once:true});}
    // portfolio slots: if that video file hasn't been uploaded yet, hide the slot
    else if(el.tagName==='VIDEO'&&frame.hasAttribute('data-hide-missing')){el.addEventListener('error',function(){var c=frame.closest('.pv')||frame;c.hidden=true;},{once:true});}
    frame.innerHTML='';frame.appendChild(el);frame.classList.add('has-video');frame.classList.remove('tilt');
  }
  // links come from /videos-config.js (YouTube links or /videos/file.mp4)
  var CFG=window.BARKFLAIR_VIDEOS||{};
  var feat=document.querySelector('.featured-frame');
  if(feat&&CFG.featured&&String(CFG.featured).trim())feat.setAttribute('data-video',String(CFG.featured).trim());
  document.querySelectorAll('.pv-frame[data-slot]').forEach(function(f){
    var v=(CFG.portfolio||[])[+f.getAttribute('data-slot')-1]||{},fig=f.closest('.pv'),url=String(v.url||'').trim();
    if(!url){fig.hidden=true;return;}
    f.setAttribute('data-video',url);
    if(v.title)fig.querySelector('figcaption b').textContent=v.title;
    if(v.subtitle)fig.querySelector('figcaption span').textContent=v.subtitle;
    if(v.shape==='wide')fig.classList.add('wide');
  });
  document.querySelectorAll('.vid-frame[data-video]').forEach(function(frame){
    var src=(frame.getAttribute('data-video')||'').trim();if(src)loadVideo(frame,src);
  });
  // the client video section stays hidden until at least one video link is added
  var cv=document.getElementById('client-videos');
  if(cv&&cv.querySelector('.vid-frame.has-video'))cv.hidden=false;

  // every text, tag, button and image inside a card pops in one by one, right after the card itself
  var ITEM_SEL='h3,p,li,blockquote,summary,legend,label,.mono,.ratio span,.amt,.stars,.play,.post-cover,.go,.price,.btn,.chips span,.vid-frame,.vid-meta,a.more,.ticks > span,.foot > *,.review footer,.upsell > b,.trust span';
  function secs(v){v=(v||'').split(',')[0].trim();return v.indexOf('ms')>-1?parseFloat(v)/1000:(parseFloat(v)||0);}
  document.querySelectorAll('.reveal').forEach(function(card){
    var found=Array.prototype.filter.call(card.querySelectorAll(ITEM_SEL),function(el){
      if(el.hidden||el.closest('.split-words'))return false;
      if(el.tagName!=='SUMMARY'&&el.closest('details'))return false; // FAQ answers stay ready for when they're opened
      var r=el.parentElement.closest('.reveal');if(r!==card)return false;   // belongs to a nested card
      return true;
    });
    var set=found.filter(function(el){ // skip items sitting inside another chosen item
      for(var a=el.parentElement;a&&a!==card;a=a.parentElement){if(found.indexOf(a)>-1)return false;}return true;
    });
    if(!set.length)return;
    var base=(card.classList.contains('cascade')?0:0.16)+secs(card.style.animationDelay||getComputedStyle(card).animationDelay);
    set.forEach(function(el,j){el.classList.add('pop-item');el.style.animationDelay=(base+Math.min(j,12)*0.06).toFixed(2)+'s';});
  });

  var targets=document.querySelectorAll('.reveal,.split-words,.draw-in');
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      var el=en.target;
      if(en.isIntersecting){
        el.classList.add('is-visible');
        if(!keepWatching(el))io.unobserve(el);
        // siblings in the same row that sit off to the side (e.g. in a horizontal scroller) come in too
        if(el.parentNode&&el.parentNode.classList&&el.parentNode.classList.contains('stagger')){
          Array.prototype.forEach.call(el.parentNode.children,function(sib){
            if(sib!==el&&sib.classList.contains('reveal')&&!sib.classList.contains('is-visible')&&sib.getBoundingClientRect().top<window.innerHeight*0.9){
              sib.classList.add('is-visible');if(!keepWatching(sib))io.unobserve(sib);
            }
          });
        }
      }else{
        // resets are handled by resetIO below
      }
    });
  },{rootMargin:'0px 0px -10% 0px',threshold:0.12});
  // Replay: reset an item only once it is COMPLETELY below the screen (you scrolled back up past it).
  // This uses a separate observer with no margin, so the item's own 3D motion can never hide it while you're looking at it.
  // position on the page ignoring any 3D transform (so an animation in progress never counts as "off screen")
  function layoutTop(el){
    if(el.offsetParent===undefined)return el.getBoundingClientRect().top+window.pageYOffset; // SVG
    var y=0;while(el){y+=el.offsetTop||0;el=el.offsetParent;}return y;
  }
  var resetIO=new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      var el=en.target;
      if(!en.isIntersecting&&keepWatching(el)&&el.classList.contains('is-visible')&&layoutTop(el)-window.pageYOffset>=window.innerHeight){
        el.classList.remove('is-visible');
      }
    });
  },{threshold:0});
  targets.forEach(function(el){io.observe(el);resetIO.observe(el);});
  window.__scroll3d=true;
})();

(function(){
  // animated reel captions
  var lines=[["STOP","SCROLLING","THIS"],["EDIT","WILL","SELL"],["YOUR","PRODUCT","FOR","YOU"]];
  var hits={"SCROLLING":1,"SELL":1,"YOU":1};
  var cap=document.getElementById('cap'),tc=document.getElementById('tc');
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var li=0,wi=0,frames=0;
  function render(){
    if(!cap)return;
    cap.innerHTML=lines[li].map(function(w,i){return '<span class="'+(i<=wi?'on':'')+(i<=wi&&hits[w]?' hit':'')+'">'+w+'</span>'}).join(' ');
  }
  render();
  if(cap&&tc&&!reduce){
    setInterval(function(){
      wi++; if(wi>=lines[li].length){wi=0;li=(li+1)%lines.length}
      render();
    },500);
    setInterval(function(){
      frames=(frames+1)%(6*30);
      var s=Math.floor(frames/30),f=frames%30;
      tc.textContent='00:0'+s+':'+(f<10?'0':'')+f;
    },1000/30);
  } else { wi=lines[0].length-1; render(); }

  // copy email
  var copyBtn=document.getElementById('copy');
  if(copyBtn)copyBtn.addEventListener('click',function(){
    var b=this,t=document.getElementById('em').textContent;
    function sel(){var r=document.createRange();r.selectNodeContents(document.getElementById('em'));var s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent='Selected';}
    try{navigator.clipboard.writeText(t).then(function(){b.textContent='Copied'},sel)}catch(e){sel()}
  });

  // smooth scrolling engine: inertia scrolling on mouse/trackpad, native momentum on touch screens
  var header=document.querySelector('header'),body=document.body;
  function headerH(){return header?header.getBoundingClientRect().height:0}
  var lenis=null,velocity=0;
  if(!reduce&&window.Lenis){
    document.documentElement.style.scrollBehavior='auto';
    lenis=new Lenis({duration:1.15,easing:function(t){return Math.min(1,1.001-Math.pow(2,-10*t))},smoothWheel:true,syncTouch:false,wheelMultiplier:1,touchMultiplier:1.4});
    lenis.on('scroll',function(e){velocity=e.velocity||0;});
    (function raf(t){lenis.raf(t);requestAnimationFrame(raf);})(performance.now());
  }
  function easeScrollTo(y){
    if(lenis){lenis.scrollTo(y,{duration:1.3});return;}
    if(reduce){window.scrollTo(0,y);return;}
    var start=window.pageYOffset,dist=y-start,dur=Math.min(1100,Math.max(450,Math.abs(dist)*.45)),t0=null;
    function step(t){if(!t0)t0=t;var p=Math.min(1,(t-t0)/dur),e=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;window.scrollTo(0,start+dist*e);if(p<1)requestAnimationFrame(step);}
    requestAnimationFrame(step);
  }
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[href*="#"]');if(!a)return;
    var href=a.getAttribute('href'),i=href.indexOf('#');
    var path=href.slice(0,i),here=location.pathname.replace(/index\.html$/,'');
    if(path&&path!==here)return; // link to another page: let the browser go there
    var id=href.slice(i);
    var el=null;try{el=id==='#'||id==='#top'?document.body:document.querySelector(id);}catch(err){}if(!el)return;
    e.preventDefault();closeMenu();
    var y=el===document.body?0:el.getBoundingClientRect().top+window.pageYOffset-headerH()+1;
    if(!lenis)document.documentElement.style.scrollBehavior='auto';
    easeScrollTo(Math.max(0,y));
  });

  // scroll-linked motion: phone parallax, marquee that speeds up as you scroll
  var phone=document.querySelector('.phone'),track=document.querySelector('.marquee-track'),mx=0,lastY=window.pageYOffset;
  if(!reduce){
    (function loop(){
      var y=window.pageYOffset;
      if(!lenis){velocity=velocity*.85+(y-lastY)*.15;}
      lastY=y;
      if(phone&&y<window.innerHeight*1.2){phone.style.transform='translate3d(0,'+(y*-0.12).toFixed(1)+'px,0) rotate('+(y*0.004).toFixed(2)+'deg)';}
      if(track){
        var half=track.scrollWidth/2;
        mx-=0.6+Math.min(12,Math.abs(velocity)*0.35);
        if(half&&-mx>=half)mx+=half;
        track.style.transform='translate3d('+mx.toFixed(1)+'px,0,0) skewX('+Math.max(-8,Math.min(8,velocity*-0.4)).toFixed(2)+'deg)';
      }
      requestAnimationFrame(loop);
    })();
  }

  // mobile menu
  var menuBtn=document.getElementById('menuBtn');
  function closeMenu(){body.classList.remove('menu-open');if(menuBtn){menuBtn.setAttribute('aria-expanded','false');menuBtn.setAttribute('aria-label','Open menu');}}
  if(menuBtn)menuBtn.addEventListener('click',function(){
    var open=body.classList.toggle('menu-open');
    menuBtn.setAttribute('aria-expanded',open?'true':'false');
    menuBtn.setAttribute('aria-label',open?'Close menu':'Open menu');
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMenu()});

  // scroll progress bar
  var bar=document.getElementById('progress'),ticking=false;
  function onScroll(){
    if(ticking)return;ticking=true;
    requestAnimationFrame(function(){
      var h=document.documentElement.scrollHeight-window.innerHeight;
      bar.style.transform='scaleX('+(h>0?Math.min(1,window.pageYOffset/h):0)+')';
      ticking=false;
    });
  }
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();


  // phone field: keep only numbers and + ( ) - spaces
  var phoneIn=document.getElementById('phone');
  if(phoneIn)phoneIn.addEventListener('input',function(){var v=phoneIn.value.replace(/[^\d+()\-\s]/g,'');if(v!==phoneIn.value)phoneIn.value=v;});

  var fine=window.matchMedia&&window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // hover tilt + glow that follows the mouse (computers only)
  if(fine){
    document.querySelectorAll('.tilt,.glow').forEach(function(card){
      var raf=0;
      card.addEventListener('pointermove',function(e){
        if(e.pointerType!=='mouse')return;
        var r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
        cancelAnimationFrame(raf);
        raf=requestAnimationFrame(function(){
          card.style.setProperty('--mx',(x*100).toFixed(1)+'%');card.style.setProperty('--my',(y*100).toFixed(1)+'%');
          if(!reduce&&card.classList.contains('tilt')){card.classList.add('tracking');card.style.setProperty('--ry',((x-.5)*10).toFixed(2)+'deg');card.style.setProperty('--rx',((.5-y)*8).toFixed(2)+'deg');}
        });
      });
      card.addEventListener('pointerleave',function(){
        cancelAnimationFrame(raf);card.classList.remove('tracking');
        card.style.removeProperty('--rx');card.style.removeProperty('--ry');
      });
    });
  }

  // green custom cursor (mouse/trackpad only; phones and tablets keep normal touch)
  if(fine){
    var dot=document.querySelector('.cursor-dot'),ring=document.querySelector('.cursor-ring');
    var mx=-100,my=-100,rx=-100,ry=-100,started=false;
    var hoverSel='a,button,summary,.post,.tilt,.glow,.pills label,select,[role="button"]';
    document.addEventListener('pointermove',function(e){
      if(e.pointerType!=='mouse')return;
      mx=e.clientX;my=e.clientY;
      if(!started){started=true;rx=mx;ry=my;body.classList.add('has-cursor');loop();}
      body.classList.remove('cursor-out');
      var t=e.target;
      body.classList.toggle('cursor-text',!!(t.closest&&t.closest('input:not([type=checkbox]),textarea')));
      body.classList.toggle('cursor-hover',!!(t.closest&&t.closest(hoverSel)));
    },{passive:true});
    document.addEventListener('pointerdown',function(){body.classList.add('cursor-down')});
    document.addEventListener('pointerup',function(){body.classList.remove('cursor-down')});
    document.documentElement.addEventListener('mouseleave',function(){body.classList.add('cursor-out')});
    function loop(){
      rx+=(mx-rx)*(reduce?1:.22);ry+=(my-ry)*(reduce?1:.22);
      dot.style.transform='translate3d('+mx+'px,'+my+'px,0)';
      ring.style.transform='translate3d('+rx.toFixed(1)+'px,'+ry.toFixed(1)+'px,0)';
      requestAnimationFrame(loop);
    }
  }

  // form
  var formEl=document.getElementById('f');
  if(formEl)formEl.addEventListener('submit',function(e){
    e.preventDefault();
    var n=document.getElementById('name'),m=document.getElementById('mail'),out=document.getElementById('sent');
    var ph=document.getElementById('phone'),digits=ph.value.replace(/\D/g,'');
    if(ph.value.trim()&&(digits.length<7||digits.length>15)){
      out.hidden=false;out.textContent='Please check your phone number. Include your country code, like +1 for the US.';ph.focus();return;
    }
    if(!n.value.trim()||!/^\S+@\S+\.\S+$/.test(m.value)){
      out.hidden=false;out.textContent='Please add your name and a valid email so we can reply.';(n.value.trim()?m:n).focus();return;
    }
    // CONTACT FORM: handled by /contact.php on your hosting (emails you + saves to barkflair-leads.csv)
    var FORM_ENDPOINT='/contact.php';
    var btn=e.target.querySelector('button[type=submit]');btn.disabled=true;
    fetch(FORM_ENDPOINT,{method:'POST',body:new FormData(e.target),headers:{'Accept':'application/json'}})
      .then(function(r){if(!r.ok)throw 0;
        out.hidden=false;out.textContent='Thanks, '+n.value.trim().split(' ')[0]+'! We got your project details and usually reply within a few hours.';e.target.reset();})
      .catch(function(){out.hidden=false;out.textContent='Something went wrong sending the form. Please email us at hello@barkflair.com.';})
      .finally(function(){btn.disabled=false;});
  });
})();

/* Portfolio videos: our own MP4 files, played right on the page (iPhone friendly) */
(function(){
  function stopOthers(keep){document.querySelectorAll('.gd-play video').forEach(function(v){if(v!==keep&&!v.paused)v.pause();});}
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('.gd-btn');if(!b)return;
    var src=b.getAttribute('data-mp4');if(!src)return;
    var box=document.createElement('div');box.className='gd-play';
    var v=document.createElement('video');
    v.setAttribute('playsinline','');v.playsInline=true;v.controls=true;v.preload='auto';
    var img=b.querySelector('img');if(img)v.poster=img.getAttribute('src');
    v.src=src;box.appendChild(v);b.replaceWith(box);
    v.addEventListener('play',function(){stopOthers(v);});
    stopOthers(v);
    var p=v.play();if(p&&p.catch)p.catch(function(){});
  });
})();
