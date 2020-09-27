const fs = require('fs');
const ini = require('ini');

class Configs {
    config

    init(defaultConfig = null, configDir = null) {
        this.config = ini.parse(fs.readFileSync(configDir, 'utf-8'));
        this.copyInto(defaultConfig, this.config);
        this.config = defaultConfig;
        return defaultConfig || {};
    }

    copyInto(oldConfig, newConfig) {
        for (let key in newConfig) {
            if (!newConfig.hasOwnProperty(key)) continue
            if ('object' === typeof (newConfig[key])) {
                oldConfig[key] = oldConfig[key] || {};
                this.copyInto(oldConfig[key], newConfig[key]);
                continue;
            }
            oldConfig[key] = newConfig[key];
        }
    }

    get() {
        return this.config;
    }
}

module.exports = new Configs();
