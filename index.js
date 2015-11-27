'use strict';

/**
 * 统计库
 * @author tvrcgo
 * @since 2015/11
 */

var path = require('path');
var fs = require('fs');
var util = require('util');
var qs = require('querystring');

// 应用配置
var appId = "node-stat";
var dir = path.join(__dirname, "/log");
// Loggers
var loggers = {};

/**
 * 写日志对象
 * @param {Object} 实例化参数
 */
function Logger (options) {

    if ( !(this instanceof Logger) ) {
        return new Logger(options);
    }

    this._type = options.type || '';
    this._filename;
    this._stream;
}

/**
 * 获取日志流
 */
Logger.prototype.stream = function(){

    var tm = _TM();
    var tmstr = tm[0] + '' + tm[1] + '' + tm[2] + '' + tm[3]; //yyyymmddHH
    var filename = [appId, this._type, tmstr].join('_') + '.log';

    if ( !this._stream || !this._filename || this._filename !== filename ) {
        if (this._stream) {
            this._stream.end();
        }
        this._filename = filename;
        this._stream = fs.createWriteStream(path.join(dir, filename), { flags: 'a', encoding:'utf-8' });
    }

    return this._stream;
}

/**
 * 写日志
 * @param {Object} 日志参数对象
 */
Logger.prototype.log = function(params){

    var stream = this.stream();
    var fields = [];

    Object.keys(params).forEach(function(key){
        var val = !_non(params[key]) ? params[key] : '';
        // 过滤日志分隔符
        if (typeof val == 'string' || val instanceof String) {
            val = val.replace(/`/g, '\'');
        }
        fields.push(key + '=' + val);
    })

    var log = fields.join('`') + "\n";

    !config.PROD && console.log('['+ this._type +']', log);
    stream.write(log);
}

/**
 * 统计对象
 * @param {Object} 实例化参数
 */
function Stat(opts){
    if (!(this instanceof Stat)) {
        return new Stat(opts);
    }
    opts = opts || {};

    appId = opts.appId || opts.id || appId;
    dir = opts.dir || dir;

    var tm = _TM(),
        tmstr = tm[0] + '-' + tm[1] + '-' + tm[2] + ' ' + tm[3] + ':' + tm[4] + ':' + tm[5];

    var params = {
        tm: tmstr
    };

    this._params = params;
    return this;
}

/**
 * 中间件：初始化公共参数，扩展 res.stat 对象
 * @param {Object} 中间件参数
 */
Stat.mixin = function(opts){

    return function(req, res, next){

        var ref = req.headers['referer'] || '';
        var ua = req.headers['user-agent'];
        var url = req.url || '';

        var params = {
            xpath: req.path,
            xurl: url,
            xua: ua,
            xref: ref
        };

        // 用户唯一ID: xuid
        // 获取不到 uid 时生成一个随机ID，如非UC用户
        params.xuid = req.query.uid || _uuid();

        //合并 req.query 参数
        _mix( params, req.query );

        // 过滤不需要的字段
        _except( params, ['_ts', '_t'] );

        // 扩展 res.stat 对象
        res.stat = Stat(params);

        next();
    }
};

/**
 * 合并新参数
 * @param {Object|Function} 参数对象或函数运行返回对象
 */
Stat.prototype.mix = function(param){
    if ( param && typeof param === 'function' ) {
        param = param.call(this, this._params);
    }
    param = param || {};
    _mix( this._params, param );
    return this;
};

/**
 * 获取统计参数
 * @param  {String} key
 */
Stat.prototype.param = function(key) {
    return this._params[key] || '';
};

/**
 * 获取 Logger 对象
 * @param {String} 日志类型
 */
Stat.prototype.logger = function(type){
    if (!loggers[type]) {
        loggers[type] = Logger({ type: type });
    }
    return loggers[type];
};

/**
 * pageview 统计日志
 * @param {Object} 日志参数对象
 */
Stat.prototype.pageview = function(opts){
    opts = opts || {};
    opts.type = 'pageview';
    var params = _mix({}, this._params, opts);
    this.logger('pageview').log(params);
    return this;
};

/**
 * event 统计日志
 * @param {Object} 日志参数对象
 */
Stat.prototype.event = function(opts){
    opts = opts || {};
    opts.type = 'event';
    var params = _mix({}, this._params, opts);
    _except(params, ['xurl', 'xref']);
    this.logger('event').log(params);
    return this;
};

/**
 * click 统计日志
 * @param {Object} 日志参数对象
 */
Stat.prototype.click = function(opts){
    opts = opts || {};
    opts.type = 'click';
    var params = _mix({}, this._params, opts);
    _except(params, ['xurl', 'xref']);
    this.logger('click').log(params);
    return this;
};

/**
 * error 统计日志
 * @param {Object} 日志参数对象
 */
Stat.prototype.error = function(opts){
    opts = opts || {};
    opts.type = 'error';
    var params = _mix({}, this._params, opts);
    this.logger('error').log(params);
    return this;
};

module.exports = Stat;

/**
 * 生成用户唯一ID
 * @return {String} 3个8位随机串连接
 */
function _uuid() {
    // 三个8位的随机串
    return [_ss(), _ss(), _ss()].join('-');
}

/**
 * 8位随机串
 */
function _ss() {
    return Math.random().toString(16).substr(2);
}

/**
 * 当前时间戳
 */
function _TM(){

    var dat = new Date
	var y = dat.getFullYear();
	var m = dat.getMonth() + 1;
	var d = dat.getDate();

	var H = dat.getHours();
	var M = dat.getMinutes();
	var S = dat.getSeconds();
	var MM = dat.getMilliseconds();

	if (m <= 9) m = '0' + m;
	if (d <= 9) d = '0' + d;
	if (H <= 9) H = '0' + H;
	if (M <= 9) M = '0' + M;
	if (S <= 9) S = '0' + S;

	return [y,m,d,H,M,S,MM]
}

/**
 * 合并对象
 * @param {[Object]} 两个或多个对象
 * @return {Object } 合并后的对象
 */
function _mix() {
    var args = [].slice.call(arguments);
    var src = args[0] || {};
    for (var i=1; i<args.length; i++) {
        var tar = args[i];
        for( var key in tar ) {
            if ( tar.hasOwnProperty(key) && !_non(tar[key]) ) {
                src[key] = tar[key];
            }
        }
    }
    return src;
}

/**
 * 过滤字段
 * @param  {Object} params 参数对象
 * @param  {Array} keys  要过滤的参数key数组
 * @return {Object}   过滤后的对象
 */
function _except(params, keys) {
    for(var key in params) {
        if (keys.indexOf(key)>=0) {
            delete params[key];
        }
    }
    return params;
}

/**
 * 解析 QueryString 参数
 * @param  {String} url URL
 * @return {Object} query参数对象
 */
function _query(url) {
    return qs.parse(url.split('?')[1] || '') || {};
}

/**
 * is null or undefined
 * @param  {*} obj
 * @return {Bool}
 */
function _non(obj) {
    return obj === null || obj === undefined;
}
