var downloadManagerMainQueueRegistered = false;

var circleProgress = null;

var initDownloadManager = (force) => {
    if(window.location.href.split(`?`)[0].endsWith(`index.html`) && !force) return console.log(`initDownloadManager / skipping initDownloadManager because index.html is loaded`)

    console.log(`initDownloadManager / ${downloadManagerMainQueueRegistered}`)

    if(document.getElementById('downloadsList') && document.getElementById('downloadsIcon') && !downloadManagerMainQueueRegistered) {
        const downloadsList = document.getElementById('downloadsList');
        const downloadsIcon = document.getElementById('downloadsIcon').cloneNode(true);
        const p = document.createElement(`p`);

        p.id = `downloadsListText`
        p.style.margin = `0px`;

        if(!circleProgress) circleProgress = addProgressCircle(document.getElementById('downloadsList'), null, false);
        
        circleProgress.setProgress(0);
        
        mainQueue.queueUpdate(function (m) {
            if(m.type == `queue`) {
                console.log(m.data)
            
                const queueLength = m.data.active.length + m.data.queue.length + m.data.paused.length;
            
                if(queueLength > 0) {
                    if(downloadsList.querySelector(`#downloadsIcon`)) {
                        downloadsList.removeChild(downloadsList.querySelector(`#downloadsIcon`))
                    };

                    if(!downloadsList.querySelector(`#downloadsListText`)) downloadsList.appendChild(p);
            
                    p.innerHTML = `${queueLength}`;
                } else {
                    p.innerHTML = ``;
                    
                    if(!downloadsList.querySelector(`#downloadsIcon`)) {
                        downloadsList.appendChild(downloadsIcon)
                    };

                    if(m.data.complete.length > 0 && downloadsIcon.classList.contains(`fa-circle`)) {
                        downloadsIcon.classList.remove(`fa-circle`);
                        downloadsIcon.classList.add(`fa-dot-circle`);
                    } else if(m.data.complete.length == 0 && downloadsIcon.classList.contains(`fa-dot-circle`)) {
                        downloadsIcon.classList.remove(`fa-dot-circle`);
                        downloadsIcon.classList.add(`fa-circle`);
                    }

                    if(downloadsList.querySelector(`#downloadsListText`)) downloadsList.removeChild(p);
                };

                if(queueLength + m.data.complete.length == 0) {
                    circleProgress.setProgress(0);
                }
            }
        });

        downloadManagerMainQueueRegistered = true;

        mainQueue.queueProgress((num) => {
            console.log(`queueProgress: ${num}`)
            if(num > 100) {
                circleProgress.setProgress(null);
            } else if(num >= 0) {
                circleProgress.setProgress(num);
            }
        })
        
        if(typeof formatListTemplate != `undeifned`) {
            const downloadsQueue = formatListTemplate.cloneNode(true);
            downloadsQueue.querySelector(`#formatCard`).parentNode.removeChild(downloadsQueue.querySelector(`#formatCard`));
            
            downloadsQueue.style.maxHeight = `max(calc(100vh - ${document.getElementById(`navigationBar`).offsetHeight}px - 20px), 500px)`;
            downloadsQueue.style.overflowY = `scroll`;
            
            const queueMaxHeight = downloadsQueue.style.maxHeight
            
            downloadsQueue.style.paddingLeft = `20px`
            downloadsQueue.style.paddingRight = `20px`
            
            const downloadCard = formatListTemplate.querySelector(`#formatCard`).cloneNode(true);
            downloadCard.querySelector(`#formatSubtext`).classList.remove(`d-none`);
            
            const downloadCardStates = {
                reset: (card) => {
                    card.style.opacity = 1;
                    if(!card.querySelector(`#pausePlayButton`).classList.contains(`d-none`)) card.querySelector(`#pausePlayButton`).classList.add(`d-none`);
            
                    card.querySelectorAll(`.icon`).forEach(icon => {
                        if(!icon.classList.contains(`d-none`)) icon.classList.add(`d-none`)
                    });
            
                    card.querySelector(`#downloadicon`).classList.remove(`d-none`);
                    card.querySelector(`#pauseicon`).classList.remove(`d-none`);
            
                    card.querySelector(`#formatDownload`).onclick = () => {};
                    if(card.querySelector(`#formatDownload`).classList.contains(`d-none`)) card.querySelector(`#formatDownload`).classList.remove(`d-none`);
            
                    card.querySelector(`#pausePlayButton`).onclick = () => {};
                    if(!card.querySelector(`#pausePlayButton`).classList.contains(`d-none`)) card.querySelector(`#pausePlayButton`).classList.add(`d-none`);
                },
                complete: (card, o) => {
                    console.log(`card ${card.id} set as complete`, o)

                    downloadCardStates.reset(card);
            
                    card.style.opacity = 0.5;
                    
                    card.querySelector(`#downloadicon`).classList.add(`d-none`);
                    //card.querySelector(`#checkmarkicon`).classList.remove(`d-none`);
                    card.querySelector(`#fileicon`).classList.remove(`d-none`);

                    const btn2 = card.querySelector(`#pausePlayButton`);
                
                    card.querySelector(`#trashicon`).classList.remove(`d-none`);
                    card.querySelector(`#pauseicon`).classList.add(`d-none`);
            
                    btn2.onclick = () => mainQueue.deleteFiles(card.id.split(`-`)[1]);
            
                    btn2.classList.remove(`d-none`);
                    btn2.classList.add(`d-flex`);
                    
                    //card.querySelector(`#formatDownload`).onclick = () => mainQueue.action({ action: `remove`, id: card.id.split(`-`)[1] })
                    
                    card.querySelector(`#formatDownload`).onclick = () => {
                        mainQueue.openDir(card.id.split(`-`)[1]);
                        mainQueue.action({ action: `remove`, id: card.id.split(`-`)[1] });
                    };

                    if(o.status.failed) {
                        card.querySelector(`#innerFormatCard`).style.backgroundColor = `rgba(209, 50, 85, 0.1)`;

                        const btn = card.querySelector(`#formatDownload`).cloneNode(true);

                        if(btn.classList.contains(`d-none`)) btn.classList.remove(`d-none`);
                        
                        if(o.status.errorMsgs && o.status.errorMsgs.length > 0 && !card.querySelector(`#errorMsgsButton`)) {
                            const errorMsgsBtn = btn.cloneNode(true);
            
                            const downloadIcon = errorMsgsBtn.querySelector(`#downloadicon`)
            
                            errorMsgsBtn.querySelectorAll(`.icon`).forEach(icon => {
                                if(!icon.classList.contains(`d-none`)) icon.classList.add(`d-none`)
                            });
                    
                            downloadIcon.className = `fas fa-exclamation-triangle`;

                            downloadIcon.style.color = `#d13255`;
            
                            errorMsgsBtn.id = `errorMsgsButton`;
            
                            errorMsgsBtn.onclick = () => {
                                console.log(`error msgs:`, o.status.errorMsgs);

                                dialog.create({
                                    title: `Error Logs`,
                                    body: `### [${card.querySelector(`#formatName`).innerHTML}](${o.status.url || o.status.destinationFile || ``})\n\n` + o.status.errorMsgs.map(o => `<details>\n<summary>${o.at} (@ ${o.time})</summary>\n#### \`${o.msg}\`\n\n\`\`\`\n${o.details}\n\`\`\`\n</details>`).join(`\n\n`),
                                    resizable: true
                                })
                            };

                            card.querySelector(`#formatDownload`).after(errorMsgsBtn);
                        };

                        const requeueButton = btn.cloneNode(true);

                        const downloadIcon = requeueButton.querySelector(`#downloadicon`);

                        requeueButton.querySelectorAll(`.icon`).forEach(icon => {
                            if(!icon.classList.contains(`d-none`)) icon.classList.add(`d-none`)
                        });

                        downloadIcon.className = `fas fa-redo-alt`;

                        requeueButton.id = `requeueButton`;

                        requeueButton.onclick = () => {
                            mainQueue.action({
                                action: `requeue`,
                                id: card.id.split(`-`)[1]
                            });
                        };

                        card.querySelector(`#formatDownload`).after(requeueButton);
                    }
                },
                active: (card) => {
                    downloadCardStates.reset(card);
            
                    //card.querySelector(`#pausePlayButton`).classList.remove(`d-none`)
                    // wip
            
                    card.querySelector(`#downloadicon`).classList.add(`d-none`);
                    card.querySelector(`#stopicon`).classList.remove(`d-none`);
            
                    //if(platform == `win32`) card.querySelector(`#formatDownload`).classList.add(`d-none`)
            
                    card.querySelector(`#formatDownload`).onclick = () => {
                        mainQueue.action({
                            action: `cancel`,
                            id: card.id.split(`-`)[1]
                        })
                    }
                    
                    card.querySelector(`#pausePlayButton`).onclick = () => {
                        mainQueue.action({
                            action: `pause`,
                            id: card.id.split(`-`)[1]
                        })
                    }
                },
                paused: (card) => {
                    downloadCardStates.reset(card);
            
                    card.querySelector(`#pausePlayButton`).classList.remove(`d-none`)
            
                    card.querySelector(`#downloadicon`).classList.add(`d-none`);
                    card.querySelector(`#stopicon`).classList.remove(`d-none`);
                    
                    //if(platform == `win32`) card.querySelector(`#formatDownload`).classList.add(`d-none`)
            
                    card.querySelector(`#formatDownload`).onclick = () => {
                        mainQueue.action({
                            action: `cancel`,
                            id: card.id.split(`-`)[1]
                        })
                    }
                    
                    card.querySelector(`#pauseicon`).classList.add(`d-none`);
                    card.querySelector(`#playicon`).classList.remove(`d-none`);
                    
                    card.querySelector(`#pausePlayButton`).onclick = () => {
                        mainQueue.action({
                            action: `resume`,
                            id: card.id.split(`-`)[1]
                        })
                        downloadCardStates.active(card);
                    }
                },
                queue: (card) => {
                    downloadCardStates.reset(card);
            
                    card.querySelector(`#formatDownload`).onclick = () => {
                        mainQueue.action({
                            action: `start`,
                            id: card.id.split(`-`)[1]
                        });
                        downloadCardStates.active(card);
                    }
            
                    card.querySelector(`#crossicon`).classList.remove(`d-none`);
                    card.querySelector(`#pauseicon`).classList.add(`d-none`);
            
                    card.querySelector(`#pausePlayButton`).classList.remove(`d-none`);
            
                    card.querySelector(`#pausePlayButton`).onclick = () => {
                        mainQueue.action({
                            action: `remove`,
                            id: card.id.split(`-`)[1]
                        })
                    }
                },
            }
            
            downloadsQueue.id = `downloadsQueue`;
            
            if(downloadsQueue.classList.contains(`d-none`)) downloadsQueue.classList.remove(`d-none`);
            if(downloadsQueue.classList.contains(`d-flex`)) downloadsQueue.classList.remove(`d-flex`);
            
            //downloadsQueue.classList.add(`d-none`)
            
            downloadsQueue.style.maxHeight = `0px`
            
            downloadsQueue.style.position = `fixed`;
            downloadsQueue.style[`backdrop-filter`] = `blur(15px)`;
            
            //downloadsQueue.style.bottom = window.innerHeight;
            
            //downloadsQueue.classList.add(`d-flex`);
            
            downloadsQueue.style.top = `-99999px`
            downloadsQueue.style.right = `10px`;
        
            const pageButtons = listboxTemplate.querySelector(`#innerQualityButtons`).cloneNode(true);
            pageButtons.querySelector(`#downloadBest`).innerHTML = ``;
        
            const pageBtn = pageButtons.querySelector(`#downloadBest`).cloneNode(true);
        
            pageButtons.querySelectorAll(`.downloadBestFormat`).forEach(b => b.parentNode.removeChild(b));
            
            const clearQueueDiv = pageButtons.cloneNode(true);
        
            const previousPage = pageBtn.cloneNode(true);
            previousPage.innerHTML = `Previous`;
            pageButtons.appendChild(previousPage);
        
            const pageNumText = document.createElement(`h6`);
            //pageNumText.style.color = `white`
            pageNumText.classList.add(`ez-text`)
            pageNumText.innerHTML = `Page 1/1`;
            pageButtons.appendChild(pageNumText);
        
            const nextPage = pageBtn.cloneNode(true);
            nextPage.innerHTML = `Next`;
            pageButtons.appendChild(nextPage);
        
            downloadsQueue.appendChild(pageButtons);
        
            clearQueueDiv.style.marginTop = `7px`;
        
            const clearCompletedButton = pageBtn.cloneNode(true);
            clearCompletedButton.innerHTML = `Clear Completed`;
            clearQueueDiv.appendChild(clearCompletedButton);
        
            const openFolder = pageBtn.cloneNode(true);
            openFolder.innerHTML = `Open Folder`;
            clearQueueDiv.appendChild(openFolder);
        
            const clearQueueButton = pageBtn.cloneNode(true);
            clearQueueButton.innerHTML = `Clear Queue`;
            clearQueueDiv.appendChild(clearQueueButton);
        
            downloadsQueue.appendChild(clearQueueDiv);
            
            const navigationBar = document.querySelector(`#navigationBar`);
            
            document.body.appendChild(downloadsQueue);
            
            downloadsQueue.after(navigationBar);
            
            const downloadManagers = {};
            
            let observerEnabled = false;
            
            const observer = new ResizeObserver(() => {
                if(observerEnabled) repositionNotifications(downloadsQueue.getBoundingClientRect().height, true)
            }).observe(downloadsQueue);
        
            let totalQueue = [], order = [], pageNum = 0, totalPages = 0, cardsPerPage = 5;
        
            const refreshListView = () => {
                console.log(`refreshing list view`)
        
                let queue = totalQueue.slice(pageNum * cardsPerPage, (pageNum + 1) * cardsPerPage);
        
                downloadsQueue.querySelectorAll(`.card`).forEach(card => {
                    if(!queue.find(o => o.id == card.id.split(`-`)[1])) {
                        if(downloadManagers[card.id.split(`-`)[1]]) delete downloadManagers[card.id.split(`-`)[1]];
                        //removeCardAnim(card)
                        card.parentNode.removeChild(card);
                    }
                });
        
                for (i in queue) {
                    const o = queue[i];
        
                    let card = document.getElementById(`download-${o.id}`);
        
                    if(!card) {
                        card = downloadCard.cloneNode(true)
                        card.id = `download-${o.id}`;
        
                        card.querySelector(`#formatMetaList`).classList.add(`d-none`)

                        const mediaIcons = card.querySelector(`#mediaIcons`)

                        mediaIcons.innerHTML = ``;

                        if(o.opt.info._ezytdl_ui_icon) {
                            const icon = faIconExists(`far`, o.opt.info._ezytdl_ui_icon.replace(`fa-`, ``), true, {color: `black`});
    
                            if(icon) mediaIcons.appendChild(icon);

                            if(o.opt.info._ezytdl_ui_type) mediaIcons.classList.add(`ez-selected-${o.opt.info._ezytdl_ui_type}`, `ez-selected-${o.opt.info._ezytdl_ui_type}-light`)

                            mediaIcons.style.maxWidth = 16 + 12 + `px`
                            mediaIcons.style.minWidth = 16 + 12 + `px`

                            mediaIcons.classList.remove(`justify-content-between`);
                            mediaIcons.classList.add(`justify-content-center`);

                            mediaIcons.setAttribute(`title`, o.opt.info._ezytdl_ui_title)
                        };

                        if(mediaIcons.innerHTML == ``) mediaIcons.classList.add(`d-none`);

                        if(o.opt.info.thumbnails && o.opt.info.thumbnails.length > 0) {
                            const thumbnail = o.opt.info.thumbnails.reverse().find(o => o.url);

                            if(thumbnail && typeof thumbnail == `object` && thumbnail.url) {
                                console.log(`thumbnail:`, thumbnail);
                
                                const img = new Image();
                
                                img.addEventListener(`load`, () => {
                                    if(card && card.parentElement) {
                                        console.log(`image loaded! setting bg...`)
    
                                        const formatBG = card.querySelector(`#formatCardBG`)
        
                                        formatBG.style.backgroundImage = `url(${thumbnail.url})`;
                                        formatBG.style.filter = `blur(2px)`
                
                                        anime.remove(formatBG)
                
                                        anime({
                                            targets: formatBG,
                                            opacity: [0, 0.15],
                                            duration: 1000,
                                            easing: `easeOutQuad`
                                        })
                                    }
                                });
                
                                img.src = thumbnail.url;
                            }
                        }
        
                        const downloadManager = createDownloadManager(card, o.id);
                        downloadManagers[o.id] = downloadManager;

                        console.log(`creating new card, current status:`, o.status)
                        
                        downloadManagers[o.id].update(o.status && o.status.overall ? o.status.overall : o.status);
                    }

                    let title = `[${o.status.formatID}] `;
    
                    if(o.opt.info && (o.opt.info.title || o.opt.info.output_name)) title += o.opt.info.title || o.opt.info.output_name;

                    if(card.querySelector(`#formatName`).innerHTML != title) {
                        card.querySelector(`#formatName`).innerHTML = title;
                        console.log(`title: ${card.querySelector(`#formatName`).innerHTML}`)
                    }
        
                    if(!document.querySelector(`#download-${o.id}`)) downloadsQueue.appendChild(card);
        
                    if(!card.classList.contains(`queue-${o.state}`)) {
                        if(`${card.classList}`.includes(`queue-`)) console.log(`new state: ${o.state}, previous state: ${`${card.classList}`.split(`queue-`)[1].split(` `)[0]}`)
                        
                        for (state of order) {
                            if(card.classList.contains(`queue-${state}`)) card.classList.remove(`queue-${state}`)
                        }
        
                        if(downloadCardStates[o.state]) {
                            downloadCardStates[o.state](card, o);
                        } else {
                            console.log(`NO DOWNLOAD CARD STATE FOR ${o.state} -- CARD ID ${card.id} LEFT AS IS`)
                        }
                        
                        //if(o.state == `complete` && !downloadsQueueToggled && firstRefresh) createNotification(card, clear)
        
                        card.classList.add(`queue-${o.state}`)
        
                        const selector = downloadsQueue.querySelectorAll(`.queue-${o.state}`)
                        const insertAfter = selector.item(selector.length - 1)
                        card.after(insertAfter)
                    }
                }
        
                firstRefresh = false;
            };
        
            const updateButtonStates = (disableAnyways) => {
                const completeAndNotFailed = totalQueue.filter(o => o.state == `complete` && !o.status.failed);
                const completeAndFailed = totalQueue.filter(o => o.state == `complete` && o.status.failed);

                console.log(`updating button states`)
        
                pageNumText.innerHTML = `Page ${pageNum + 1}/${totalPages + 1}`;
        
                if(pageNum == 0 || disableAnyways) {
                    previousPage.opacity = 0.5;
                    previousPage.disabled = true;
                } else {
                    previousPage.opacity = 1;
                    previousPage.disabled = false;
                }
        
                if(pageNum == totalPages || disableAnyways) {
                    nextPage.opacity = 0.5;
                    nextPage.disabled = true;
                } else {
                    nextPage.opacity = 1;
                    nextPage.disabled = false;
                }
        
                if(totalQueue.filter(o => o.state == `complete`).length > 0 && !disableAnyways) {
                    clearCompletedButton.opacity = 1;
                    clearCompletedButton.disabled = false;
                } else {
                    clearCompletedButton.opacity = 0.5;
                    clearCompletedButton.disabled = true;
                }

                if(completeAndNotFailed.length > 0 && !disableAnyways) {
                    clearCompletedButton.innerHTML = `Clear Completed (${completeAndNotFailed.length})`;
                    clearCompletedButton.onclick = () => clearFromQueue(completeAndNotFailed);
                } else if(completeAndFailed.length > 0 && !disableAnyways) {
                    clearCompletedButton.innerHTML = `Clear Failed (${completeAndFailed.length})`;
                    clearCompletedButton.onclick = () => clearFromQueue(completeAndFailed);
                } else {
                    clearCompletedButton.innerHTML = `Clear Completed`;
                    clearCompletedButton.onclick = () => {};
                }
        
                if(totalQueue.filter(o => o.state != `active` && o.state != `paused` && o.state != `complete`).length > 0 && !disableAnyways) {
                    clearQueueButton.opacity = 1;
                    clearQueueButton.disabled = false;
                    clearQueueButton.innerHTML = `Clear Queue (${totalQueue.filter(o => o.state != `active` && o.state != `paused` && o.state != `complete`).length})`;
                    clearQueueButton.onclick = () => clearFromQueue(totalQueue.filter(o => o.state != `active` && o.state != `paused` && o.state != `complete`));
                } else if(completeAndFailed.length > 0 && !disableAnyways) {
                    clearQueueButton.opacity = 1;
                    clearQueueButton.disabled = false;
                    clearQueueButton.innerHTML = `Restart Failed (${completeAndFailed.length})`;
                    clearQueueButton.onclick = () => mainQueue.action({ action: `requeue`, id: completeAndFailed.map(o => o.id) })
                } else {
                    clearQueueButton.opacity = 0.5;
                    clearQueueButton.disabled = true;
                    clearQueueButton.innerHTML = `Clear Queue`;
                    clearQueueButton.onclick = () => {}
                }
            }
        
            const pageSwitchButtonClick = (arg) => {
                if(pageNum + arg < 0 && pageNum + arg > totalPages) {
                    console.log(`invalid page number: ${pageNum + arg}/${totalPages} (previous: ${pageNum})`)
                } else {
                    console.log(`page number: ${pageNum + arg}/${totalPages} (previous: ${pageNum})`);
                    pageNum += arg;
                    refreshListView();
                };
        
                updateButtonStates();
            }
        
            previousPage.onclick = () => pageSwitchButtonClick(-1);
            nextPage.onclick = () => pageSwitchButtonClick(1);
        
            const clearFromQueue = async (queue) => mainQueue.action({ action: `remove`, id: queue.map(o => o.id) });
        
            clearCompletedButton.onclick = () => {
                const completeAndNotFailed = totalQueue.filter(o => o.state == `complete` && !o.status.failed);
                const completeAndFailed = totalQueue.filter(o => o.state == `complete` && o.status.failed);

                if(completeAndNotFailed.length > 0) {
                    clearFromQueue(completeAndNotFailed)
                } else if(completeAndFailed.length > 0) {
                    clearFromQueue(completeAndFailed)
                };
            };
            
            openFolder.onclick = () => mainQueue.openDir();
            clearQueueButton.onclick = () => clearFromQueue(totalQueue.filter(o => o.state != `active` && o.state != `paused` && o.state != `complete`));
        
            mainQueue.queueUpdate(function (m) {
                if(m.type == `queue`) {
                    console.log(m)
        
                    totalQueue = [];
            
                    order = Object.keys(m.data)
                    order.push(order.shift()); // put complete at the bottom of the list
            
                    for (state of order) totalQueue.push(...m.data[state].map(o => Object.assign({}, o, {state})))
        
                    totalPages = Math.floor(totalQueue.length / cardsPerPage)
        
                    updateButtonStates();
                    refreshListView();
                } else {
                    if(downloadManagers[m.data.id]) downloadManagers[m.data.id].update(m.data.status);
                }
            });
            
            let downloadsQueueToggled = false;

            const documentClick = (e) => {
                console.log(`click: ${downloadsQueueToggled} -- ${e.target == downloadsList || downloadsList.contains(e.target)}`)

                if(downloadsQueueToggled && e.target != downloadsQueue && !downloadsQueue.contains(e.target)) {
                    downloadsList.onclick();
                }
            }
            
            downloadsList.onclick = () => {
                anime.remove(downloadsQueue);
            
                downloadsQueue.style.maxHeight = queueMaxHeight;
            
                const currentHeight = downloadsQueue.getBoundingClientRect().height
            
                const arr = [document.getElementById(`navigationBar`).getBoundingClientRect().height - 150, document.getElementById(`navigationBar`).getBoundingClientRect().height]
            
                if(!downloadsQueueToggled) {
                    console.log(`sliding in`)
            
                    observerEnabled = true;
            
                    repositionNotifications(currentHeight, true)
            
                    if(!downloadsList.classList.contains(`ez-selected`)) downloadsList.classList.add(`ez-selected`);
                    
                    console.log(`removing document click listener`)
                    document.removeEventListener(`click`, documentClick);
            
                    anime({
                        targets: downloadsQueue,
                        top: arr,
                        duration: 500,
                        easing: `easeOutExpo`,
                        begin: () => {
                            console.log(`adding document click listener`)
                            document.addEventListener(`click`, documentClick);
                        }
                    });
                } else {     
                    console.log(`sliding out`)       
            
                    if(downloadsList.classList.contains(`ez-selected`)) downloadsList.classList.remove(`ez-selected`);
            
                    observerEnabled = false;
                    
                    repositionNotifications(0, true)
            
                    anime({
                        targets: downloadsQueue,
                        top: arr.slice(0).reverse(),
                        maxHeight: [`${currentHeight}px`, `20px`],
                        duration: 500,
                        easing: `easeOutExpo`,
                    });

                    console.log(`removing document click listener`)
                    document.removeEventListener(`click`, documentClick);
                }
            
                downloadsQueueToggled = !downloadsQueueToggled;
            }
        } else {
            downloadsList.disabled = true;
            downloadsList.opacity = 0.75;
        };
        
        mainQueue.refreshUpdates()
    }
}

if(typeof document.body == `undefined`) {
    console.log(`waiting for body to load`)
    document.addEventListener(`DOMContentLoaded`, initDownloadManager)
} else {
    console.log(`body already loaded`)
    initDownloadManager();
}