console.log(`introAnimation called`);

document.body.style.opacity = 0;

let givenCB = [];

let complete = false;

const callback = () => {
    complete = true;
    console.log(`introAnimation -- calling back ${givenCB.length} functions`)
    givenCB.forEach(c => c())
}

const introAnimation = {
    wait: (cb) => typeof cb == `function` ? complete ? cb() : givenCB.push(cb) : false
};

const updateBridge = window.location.search.slice(1) == `updateBridge`

const htmlFile = window.location.search.slice(1) == `updateBridge` ? `index.html` : window.location.search.slice(1) || `index.html`
const path = `./${htmlFile}`

history.pushState({ page: 1 }, "introAnimation", htmlFile);

const ajax = new XMLHttpRequest();
ajax.open(`GET`, path, true);
console.log(path);

ajax.onload = async () => {
    console.log(ajax.responseText);

    const h = document.createElement(`html`);
    h.innerHTML = ajax.responseText;
    
    for (node of h.querySelectorAll(`head > *`)) {
        if(!(node.href && node.href.endsWith(`theme.css`))) document.head.appendChild(node);
    }

    const finish = () => new Promise(async res => {
        h.querySelector(`body`).style.opacity = 0;

        searchHighlights(h.querySelector(`body`));
    
        document.body = h.querySelector(`body`);

        document.body.style.background = `rgb(10,10,10)`

        await scripts.topjs();
        await scripts.pagescript(htmlFile.split(`.`).slice(0, -1).join(`.`))
        await scripts.afterload();
    
        if(typeof getVersion != `undefined`) getVersion()
        initDownloadManager();
        
        console.log(`loaded scripts!`);
    
        const navigationBar = document.body.querySelector(`#navigationBar`);
        const everythingElse = document.body.querySelectorAll(`body > div:not(#navigationBar)`);
    
        if(config.disableAnimations) {
            document.body.style.opacity = 1;
            if(!updateBridge) callback();
            res();
        } else if(config.reduceAnimations) {
            const a = anime({
                targets: document.body,
                opacity: [0, 1],
                duration: 1500,
                easing: `easeOutExpo`,
                begin: () => {
                    if(!updateBridge) callback();
                },
                complete: () => res(),
            }); a._onDocumentVisibility = () => {};
            if(updateBridge) setTimeout(() => res(), 500);
        } else {
            const a = anime({
                targets: navigationBar,
                top: [`0px`, navigationBar.style.top],
                duration: 1500,
                begin: () => {
                    document.body.style.opacity = 1;
                },
                complete: () => res(),
                easing: `easeOutExpo`,
            }); a._onDocumentVisibility = () => {};

            if(updateBridge) setTimeout(() => res(), 500);
            
            everythingElse.forEach(element => anime({
                targets: element,
                //scale: [0, 1],
                marginTop: [`500vh`, element.style.marginTop || `0px`],
                duration: 2500,
                easing: `easeOutExpo`,
                begin: () => {
                    document.body.style.opacity = 1;
                    if(!updateBridge) callback();
                },
                complete: () => {
                    console.log(`done`);
                    res();
                }
            }));
        }
    });

    if(updateBridge) {
        console.log(`updateBridge`);

        const popout = createPopout({
            buttons: [
                {
                    element: h.querySelector(`#background`),
                    href: `updating.html`
                }
            ],
            closeOnNavigate: true,
            addEventListeners: false,
            updatePosition: true,
            completeHook: () => callback()
            /*overlayCompleteHook: () => {
                if(document.querySelector(`#everythingContainer`)) anime({
                    targets: document.querySelector(`#everythingContainer`),
                    opacity: 0,
                    duration: 350,
                    easing: `easeInCirc`,
                    //complete: () => window.location.href = `introAnimation.html?${htmlFile}`
                })
            },
            completeHook: () => {
                if(document.querySelector(`#background`)) {
                    anime.remove(document.querySelector(`#background`))
                    anime({
                        targets: document.querySelector(`#background`),
                        opacity: 0,
                        duration: 350,
                        easing: `easeInCirc`,
                    });
                }

                anime.remove(document.body)
                anime({
                    targets: document.body,
                    opacity: 0,
                    duration: 350,
                    easing: `easeInCirc`,
                    complete: () => window.location.href = `introAnimation.html?index.html`
                })
            }*/
        });

        let inProgress = true;

        update.event(m => {
            if(m.complete) inProgress = false;
            popout.setCloseable(!inProgress);
        });

        popout.setCloseable(false);

        finish().then(() => {
            popout.buttons[0].click();
        });
    } else {
        finish();
    }
};

ajax.send();