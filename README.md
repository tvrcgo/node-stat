# node-stat
statistic lib for node.js

## Content
- `mixin` 中件间
- `mix` 添加公参
- `param` 获取已记录的参数
- `click` 写 click 日志
- `event` 写 event 日志
- `pageview` 写 pageview 日志
- `error` 写 error 日志

## Usage

#### 中间件
添加 stat 中间件会扩展 res.stat 对象。
```js
var stat = require('node-stat');

router.use(stat.mixin({
    id: "node-stat",
    dir: path.join(__dirname, '../../private/log')
}))
```
中件间参数：
- `id` 应用ID
- `dir` 存放日志的目录

#### 添加公共参数
各类统计日志共用的参数可一次性添加。
```js
function(req, res, next){
    res.stat.mix({
        happy: true,
        really: true
    })
}
```

#### 写统计日志
Event
```js
function(req, res, next){
    res.stat.event({

    })
}
```

Click
```js
function(req, res, next){
    res.stat.click({

    })
}
```

Pageview
```js
function(req, res, next){
    res.stat.pageview({

    })
}
```

Error
```js
function(req, res, next){
    res.stat.error({

    })
}
```

#### 自定义日志类型
```js
function(req, res,next) {
    res.stat.logger('custom_type').log({

    })
}
```

## License
MIT
