const errorHandler = require("./util/errorHandler.js");

const fs = require('fs');
const pfs = require('./util/promisifiedFS');
const os = require('os');

const sendNotification = require("./core/sendNotification.js");

let newSettingsNotifSent = false;

let firstCheckDone = false;

let mainConfigPromise = null;

const postConfigExtensions = (userConfig) => new Promise(async res => {
    if(!userConfig.saveLocation) userConfig.saveLocation = require(`path`).join((await pfs.existsSync(require(`path`).join(os.homedir(), `Downloads`)) ? require(`path`).join(os.homedir(), `Downloads`) : os.homedir()), `ezytdl`);

    userConfig.strings = require(`./configStrings.json`)
    userConfig.descriptions = require(`./configDescriptions.json`);

    for(const extension of Object.entries(require(`./core/configExtensions.js`).post)) await extension[1](userConfig);

    res(userConfig);
})

const configCache = new Map();

module.exports = (configObject, {
    source=`./defaultConfig.json`,
    target=`config.json`,
    allowNonexistentRemoval=true,
    allowChangedDefaults=true,
    waitForPromise=true,
    values=false,
    clearConfigCache=true,
}={}) => {
    const custom = source != `./defaultConfig.json` && target != `config.json` ? true : false;

    const key = `${source}-${target}`;

    if(!configObject && configCache.has(key)) {
        //console.log(`[CONFIG / ${key}] config cached! returning`)
        if(custom) {
            return Promise.resolve(configCache.get(key));
        } else {
            return postConfigExtensions(configCache.get(key));
        }
    } else if(configObject && clearConfigCache) {
        console.log(`[CONFIG / ${key}] config object passed! clearing cache...`)
        configCache.clear();
    } else if(configObject) {
        console.log(`[CONFIG / ${key}] config object passed! not clearing cache...`)
    } else console.log(`[CONFIG / ${key}] config not cached! creating...`);

    const promise = new Promise(async res => {
        const started = Date.now();

        if(custom && mainConfigPromise && waitForPromise) {
            console.log(`[CONFIG / ${key}] waiting for main config to load...`)
            await mainConfigPromise;
        } else if(custom && mainConfigPromise && !waitForPromise) {
            console.log(`[CONFIG / ${key}] main config is loading, but waiting for it is disabled!`)
        } else if(custom) {
            console.log(`[CONFIG / ${key}] main config already loaded!`)
        } else {
            console.log(`[CONFIG / ${key}] loading main config...`)
        };

        console.log(`[CONFIG / ${key}] loading this config... (after ${Date.now() - started}ms)`)

        try {
            const defaultConfig = Object.assign({}, require(source));
    
            if(!custom) for(const extension of Object.entries(require(`./core/configExtensions.js`).defaults)) await extension[1](defaultConfig);
        
            await pfs.mkdirSync(global.configPath, { recursive: true, failIfExists: false });
            
            let checked = false;
    
            if(!await pfs.existsSync(`${global.configPath}/${target}`)) {
                fs.writeFileSync(`${global.configPath}/${target}`, JSON.stringify(defaultConfig, null, 4), { encoding: `utf-8` });
                checked = true;
            } else {
                try {
                    JSON.parse(await pfs.readFileSync(`${global.configPath}/${target}`));
                } catch(e) {
                    await pfs.unlinkSync(`${global.configPath}/${target}`);
                    module.exports(configObject);
                }
            };
    
            const checkKeys = (logPrefix, thisKey, config, defaults, addDefaults, removeNonexistent) => {
                if(removeNonexistent && allowNonexistentRemoval) {
                    for(const key of Object.keys(config)) {
                        if(typeof defaults[key] == 'undefined') {
                            delete config[key];
                            checked = true;
                        }
                    }
                }
    
                for(const key of Object.keys(defaults)) {
                    if(addDefaults && typeof config[key] == `undefined`) {
                        if(!newSettingsNotifSent && !firstCheckDone && !custom) {
                            newSettingsNotifSent = true;
                            sendNotification({
                                headingText: `New settings!`,
                                bodyText: `New settings have been added to the config! Please check your settings!`
                            });
                        }
    
                        config[key] = defaults[key];
                        checked = true;
                    };
    
                    if(!addDefaults && !config[key]) {
    
                    } else {
                        //console.log(`key`, key, `type`, typeof config[key], `value`, config[key], `default type`, typeof defaults[key], `default value`, defaults[key])
                        
                        if(!allowChangedDefaults && defaults[key] && defaults[key] != config[key]) {
                            config[key] = defaults[key];
                            checked = true;
                        } else if(defaults[key] && typeof defaults[key] == `object`) {
                            //console.log(`checking keys for ${key}`)
                            config[key] = checkKeys(logPrefix + ` > `, thisKey + ` / ` + key, config[key], defaults[key], addDefaults, removeNonexistent);
                        } else {
                            if(config[key] && typeof config[key] != typeof defaults[key]) {
                                if(typeof defaults[key] == `number` && !isNaN(config[key])) config[key] = Number(config[key]);
                                if(typeof defaults[key] == `boolean` && (config[key] == `true` || config[key] == `false`)) config[key] = config[key] == `true` ? true : false;
                                //console.log(`type`, typeof config[key], `value`, config[key])
                            }
            
                            if((!typeof config[key] || typeof config[key] == `undefined`) && !addDefaults) {
            
                            } else if(typeof config[key] != typeof defaults[key]) {
                                sendNotification({
                                    type: `warn`,
                                    headingText: `Config key mismatch! (${target}: ${key})`,
                                    bodyText: `The config key "${key}" is missing or is of the wrong type! (Expected: ${typeof defaults[key]}, got: ${config[key] ? typeof config[key] : ``})`
                                });
                                //console.log(config[key], defaults[key])
                                config[key] = defaults[key];
                                if(addDefaults) checked = true;
                            }
                        }
                    }
                };
    
                return config;
            }
            
            if(!checked) {
                const config = JSON.parse(await pfs.readFileSync(`${global.configPath}/${target}`));
    
                const checkedConfig = checkKeys(`> `, `root config object`, config, defaultConfig, true, true);
    
                //console.log(config, checkedConfig)
                
                if(checked) {
                    fs.writeFileSync(`${global.configPath}/${target}`, JSON.stringify(checkedConfig, null, 4), { encoding: `utf-8` });
                }
            };
            
            if(configObject) {
                const config = JSON.parse(await pfs.readFileSync(`${global.configPath}/${target}`));
    
                const checkedConfig = checkKeys(`> `, `updated config object`, configObject, defaultConfig);

                const resultingConfig = Object.assign({}, config, checkedConfig)

                if(!custom) for(const verification of Object.entries(require(`./core/configExtensions.js`).verify)) await verification[1](resultingConfig);
                
                fs.writeFileSync(`${global.configPath}/${target}`, JSON.stringify(resultingConfig, null, 4), { encoding: `utf-8` });
    
                if(!custom && configObject.alwaysUseLightIcon != undefined) require(`./core/downloadIcon.js`).set();
            };
    
            const userConfig = JSON.parse(await pfs.readFileSync(`${global.configPath}/${target}`));

            if(!custom) {
                firstCheckDone = true;

                await postConfigExtensions(userConfig);

                if(userConfig.downloadFromClipboard) {
                    global.downloadFromClipboard = true;
                } else {
                    global.downloadFromClipboard = false;
                }

                global.lastConfig = userConfig;

                require(`./util/getPath`)(`./core/confighooks`, true, null, true).then(path => {
                    pfs.readdirSync(path).then(files => files.filter(f => f.endsWith(`.js`))).then(files => {
                        for(const file of files) try {
                            require(`./core/confighooks/${file}`)(userConfig);
                            console.log(`ran config hook ${file}`)
                        } catch(e) {
                            console.error(`failed running config hook ${file}: ${e}`);
                        }
                    })
                })
            }
    
            const returnValue = values ? Object.values(userConfig) : userConfig;

            console.log(`[CONFIG / ${key}] config object created! (after ${Date.now() - started}ms)`)
    
            configCache.set(key, returnValue);

            console.log(`[CONFIG / ${key}] config cached! (after ${Date.now() - started}ms)`)

            res(returnValue);
        } catch(e) {
            console.error(e);
            errorHandler(e)
        }
    });

    if(!custom) {
        mainConfigPromise = promise;
        promise.then(() => mainConfigPromise == promise ? mainConfigPromise = null : null);
    }

    return promise;
}

module.exports.cache = configCache;