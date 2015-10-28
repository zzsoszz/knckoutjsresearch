# knckoutjsresearch
http://www.cnblogs.com/rubylouvre/archive/2012/06/18/2552369.html

knockout.js的学习笔记2

本节换一种方式解读，把我消化过的东西反刍出来可能这样大家容易理解些，knockout.js大量使用闭包，非常难读。

我们从viewModel看起：

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
  }
  var a = new MyViewModel();
  a.fullName("xxx yyy")
这里包含两种observable，没有依赖的与有依赖的，有依赖的通过没有依赖的计算出来，因此叫做computed！

但不管怎么样，它们都是返回一个函数，我们通过如下代码就可以模拟它们了：

//注：这里会用到mass Framework的种子模块的API https://github.com/RubyLouvre/mass-Framework/blob/master/src/mass.js
 //observable的传参必须是基本类型
 var validValueType = $.oneObject("Null,NaN,Undefined,Boolean,Number,String");
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
             }
             return ret;
         }else{                //getter
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
             v = getter.call(scope);
             return v;
         }
     }
     ret(); //必须先执行一次
     return ret;
 }
因此当我们执行new MyViewModel(),就会依次执行$.observable, $.observable, $.computed, $.computed中的参数的getter, getter再调用两个observable。

问题来了，当我们调用computed时，总会通知其依赖（即firstName ，lastName）进行更新，但firstName 发生改变时没有手段通知fullName 进行更新。ko把这逻辑写在dependencyDetection模块中。我简化如下：

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
我们把它加入到 $.computed 与 $.observable中，再添加一个发布更新函数valueWillMutate

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
到这里viewModel中的每个域（firstName, lastName, fullName）只要存在依赖关系都能相互通知了。


