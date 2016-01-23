# node-stat
基于日志的统计库，按日志类型和小时切分日志。

## Content
- `mixin` 中件间
- `use` 添加参数对象或返回参数对象的函数
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
    name: "webapp",
    dir: path.join(__dirname, '../../private/log')
}))
```
中件间参数：
- `name` 应用名称
- `dir` 存放日志的目录

#### 添加公共参数
```js
function(req, res, next){
    res.stat.use({
        happy: true,
        really: 'of course'
    })
    // or
    res.stat.use(function(params){
        // params: 当前全部参数
        return { url: 'new url' };
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
    res.stat.logger('publish').log({

    });
}
```

## License
MIT
