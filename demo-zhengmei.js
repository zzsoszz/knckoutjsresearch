$.oneObject=function(array, val) {
    if (typeof array === "string") {
        array = array.match(rword) || []
    }
    var result = {},
            value = val !== void 0 ? val : 1
    for (var i = 0, n = array.length; i < n; i++) {
        result[array[i]] = value
    }
    return result
};
$.error=function (str, e) {
        throw  (e || Error)(str)
};

var rword = /[^, ]+/g //切割字符串为一个个小块，以空格或豆号分开它们，结合replace实现字符串的forEach
var class2type = {}
"Boolean Number String Function Array Date RegExp Object Error".replace(rword, function (name) {
    class2type["[object " + name + "]"] = name.toLowerCase()
})

$.error = function (obj) { //取得目标的类型
    if (obj == null) {
        return String(obj)
    }
    // 早期的webkit内核浏览器实现了已废弃的ecma262v4标准，可以将正则字面量当作函数使用，因此typeof在判定正则时会返回function
    return typeof obj === "object" || typeof obj === "function" ?
            class2type[serialize.call(obj)] || "object" :
            typeof obj
}

$.log=function log() {
    if (window.console) {
        // http://stackoverflow.com/questions/8785624/how-to-safely-wrap-console-log
        Function.apply.call(console.log, console, arguments)
    }
}




var validValueType = $.oneObject("Null,NaN,Undefined,Boolean,Number,String")
$.dependencyDetection = (function () {
	var _frames = [];
	return {
		begin: function (ret) {
			_frames.push(ret);
		},
		end: function () {
			_frames.pop();
		},
		collect: function (self) {
			if (_frames.length > 0) {
				if(!self.list)
					self.list = [];
				var fn = _frames[_frames.length - 1];
				if ( self.list.indexOf( fn ) >= 0)
					return;
				self.list.push(fn);
			}
		}
	};
})();
$.valueWillMutate = function(observable){
	var list = observable.list
	if($.type(list,"Array")){
		for(var i = 0, el; el = list[i++];){
			el();
		}
	}
}
$.observable = function(value){
	var v = value;//将上一次的传参保存到v中,ret与它构成闭包
	function ret(neo){
		if(arguments.length){ //setter
			if(!validValueType[$.type(neo)]){
				$.error("arguments must be primitive type!")
				return ret
			}
			if(v !== neo ){
				v = neo;
				$.valueWillMutate(ret);//向依赖者发送通知
			}
			return ret;
		}else{                //getter
			$.dependencyDetection.collect(ret);//收集被依赖者
			return v;
		}
	}
	value = validValueType[$.type(value)] ? value : void 0;
	ret(arguments[0]);//必须先执行一次
	return ret
}
 
$.computed = function(obj, scope){//为一个惰性函数，会重写自身
	//computed是由多个$.observable组成
	var getter, setter
	if(typeof obj == "function"){
		getter = obj
	}else if(obj && typeof obj == "object"){
		getter = obj.getter;
		setter = obj.setter;
		scope  = obj.scope;
	}
	var v
	var ret = function(neo){
		if(arguments.length ){
			if(typeof setter == "function"){//setter不一定存在的
				if(!validValueType[$.type(neo)]){
					$.error("arguments must be primitive type!")
					return ret
				}
				if(v !== neo ){
					setter.call(scope, neo);
					v = neo;
				}
			}
			return ret;
		}else{
			$.dependencyDetection.begin(ret);//让其依赖知道自己的存在
			v = getter.call(scope);
			$.dependencyDetection.end();
			return v;
		}
	}
	ret(); //必须先执行一次
	return ret;
}
function MyViewModel() {
	this.firstName = $.observable('Planet');
	this.lastName = $.observable('Earth');
 
	this.fullName = $.computed({
		getter: function () {
			return this.firstName() + " " + this.lastName();
		},
		setter: function (value) {
			var lastSpacePos = value.lastIndexOf(" ");
			if (lastSpacePos > 0) { // Ignore values with no space character
				this.firstName(value.substring(0, lastSpacePos)); // Update "firstName"
				this.lastName(value.substring(lastSpacePos + 1)); // Update "lastName"
			}
		},
		scope: this
	});
	this.card = $.computed(function(){
		return this.fullName() +" 屌丝"
	},this)
	;
}
var a = new MyViewModel();
//============测试代码============
$.log(a.firstName())//Planet
$.log(a.lastName())//Earth
$.log(a.fullName())//Planet Earth 通过上面两个计算出来
a.fullName("xxx yyy");//更新fullName会自动更新firstName与lastName
$.log(a.firstName())//xxx
$.log(a.lastName())//yyy
a.firstName("ooo");//更新firstName会自动更新fullName
$.log(a.fullName())//ooo yyy
$.log(a.card())//ooo yyy 屌丝