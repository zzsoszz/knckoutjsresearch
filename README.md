# knckoutjsresearch
http://www.cnblogs.com/rubylouvre/archive/2012/06/18/2552369.html




 knockout.js的学习笔记

knockout.js试图将微软历经验证的成功方案MVVM解决方案引进JS，因此很有必要学习下。MVVM是专门为解决富交互频变动的界面开发而生，这与web开发非常相似。产经经理与测试与什么主管，他们看不懂后端的东西，也只能对前端的看得到的东西指手划脚了，因此变动是非常频繁的，每次变动，但伴随着痛若的事件重新绑定与代理，以及与它们相关的业务代码的调整，在JS这种调试特喝别痛苦的语言中，情况就更严重了。每次改版都加剧前端离职的决心，前端换了几波人才把项目做出来。jQuery号称是改变人们写JS的方式，但只是提供了更好的砖瓦而已（原生API是沙石）。想获得后端那样开发效率，必须有Struts2, Spring, rails这般一站式的框架，就开发流程进行控制，开发人员只是在框架里做填空题。这样，看另一个人的代码，就知道应该是哪里开始看起，看完这里就知道下一步应该是哪里。易读性应该由框架来塑造，维护性由框架来提供！

之所以放弃ember.js的研究是因为她对流程的控制太弱了，代码量一多，还是像狗屎一般的乱！knockout.js虽然有许多不如意的地方，但它对流程的控制是非常好的，只有三个入口。在元素上进行数据绑定，编写viewModel，将viewModel绑到目标的节点上。简单明了，其缺点可以在我通读knockout后再造一个轮子解决！

一般的数据绑定有三种:

One-Time，One-Way，Two-way。

One-Time绑定模式的意思即为从viewModel绑定至UI这一层只进行一次绑定，程序不会继续追踪数据的在两者中任何一方的变化，这种绑定方式很使用于报表数据，数据仅仅会加载一次。

One-Way绑定模式即为单向绑定，即object-UI的绑定，只有当viewModel中数据发生了变化，UI中的数据也将会随之发生变化，反之不然。

Two-Way绑定模式为双向绑定，无论数据在Object或者是UI中发生变化，应用程序将会更新另一方，这是最为灵活的绑定方式，同时代价也是最大的。

数据绑定只是作为元素的自定义属性写上标签内，并不能决定它是何种绑定。

viewModel是一个结构非常简单的hash，键名为命令，值的定义方式决定其绑定方式。 如果值是通过ko.observable定义的说明是双向绑定，否则为One-Time绑定，在knockout不存在单向绑定。knockout2.0还从ember.js借鉴了计算属性，即用ko.computed定义的，它的值会依赖其他值进行推断，因此就形成了依赖，需要构筑一枚依赖链。

最后一步是将viewModel绑到节点上，事实上它还会遍历其后代，进行绑定。默认是绑定body上，因此用户的行为只能影响到body里面的元素与URL。如果页面非常复杂，建议还是指定具体节点吧。viewModel还可以绑定注释节点，但有的公司会对页面进行压缩，去空白去注释，因此不太建议使用。

我们先从ko.applyBindings看起吧。

ko.applyBindings(viewModel, rootNode)
//这里会对rootNode进行修正
   　　　　↓
applyBindingsToNodeAndDescendantsInternal（viewModel, rootNode, true）
//第三个参数为强制绑定,会影响shouldApplyBindings变量
//如果是UL与OL会对里面的结构进行修正normaliseVirtualElementDomStructure
//通过shouldApplyBindings变量决定是否对此节点进行数据绑定
//通过applyBindingsToNodeInternal判定是否继续绑定到后代中
//通过applyBindingsToDescendantsInternal绑定到后代中

applyBindingsToNodeInternal在这里调用时其参数为rootNode， null, viewModel, true。它是一个极恶的方法，大量使用闭包。精简如下：

function applyBindingsToNodeInternal (node, bindings, viewModel, force) {
    var initPhase = 0; // 0 = before all inits, 1 = during inits, 2 = after all inits
    var parsedBindings;
    function makeValueAccessor(bindingKey) {
        return function () { 
            return parsedBindings[bindingKey] 
        }
    }
    function parsedBindingsAccessor() {
        return parsedBindings;//这是一个对象
    }

    var bindingHandlerThatControlsDescendantBindings;
    ko.dependentObservable(function () {/*略*/ },  null,{ 
        'disposeWhenNodeIsRemoved' : node 
    });
    return {
        //除了html, template命令，都允许在后代节点继续绑定
        shouldBindDescendants: bindingHandlerThatControlsDescendantBindings === undefined
    };
};

难度在于dependentObservable的第一个回调

function anonymity() {
    var bindingContextInstance = viewModelOrBindingContext && (viewModelOrBindingContext instanceof ko.bindingContext)
    ? viewModelOrBindingContext
    : new ko.bindingContext(ko.utils.unwrapObservable(viewModelOrBindingContext));
    //将viewModelOrBindingContext整成bindingContext实例
    //bindingContext实例用$data保存viewModel
    var viewModel = bindingContextInstance['$data'];
    //将bindingContextInstance绑定rootNode上
    if (bindingContextMayDifferFromDomParentElement)
        ko.storedBindingContextForNode(node, bindingContextInstance);
    // Use evaluatedBindings if given, otherwise fall back on asking the bindings provider to give us some bindings
    var evaluatedBindings = (typeof bindings == "function") ? bindings() : bindings;
    //如果bindings不存在，则通过getBindings获取，getBindings会调用parseBindingsString，变成对象
    parsedBindings = evaluatedBindings || ko.bindingProvider['instance']['getBindings'](node, bindingContextInstance);

    if (parsedBindings) {
        // First run all the inits, so bindings can register for notification on changes
        if (initPhase === 0) {
            initPhase = 1;
            for (var bindingKey in parsedBindings) {
                var binding = ko.bindingHandlers[bindingKey];
                if (binding && node.nodeType === 8)
                    validateThatBindingIsAllowedForVirtualElements(bindingKey);
                //注释节点只能绑定流程控制命令
                if (binding && typeof binding["init"] == "function") {
                    var handlerInitFn = binding["init"];
                    //在页中，用户的操作只能影响到元素的value, checked， selectedIndex, hasFocus, placeholder的变化
                    //而更多的变化需要通过绑定事件，通过JS代码调用实现
                    //因此init主要用于绑定事件
                    var initResult = handlerInitFn(node, makeValueAccessor(bindingKey), parsedBindingsAccessor, viewModel, bindingContextInstance);
                    // If this binding handler claims to control descendant bindings, make a note of this
                    if (initResult && initResult['controlsDescendantBindings']) {//这里主要是html,与template命令，只有它们阻止继续在后代中绑定事件
                        if (bindingHandlerThatControlsDescendantBindings !== undefined)
                            throw new Error("Multiple bindings (" + bindingHandlerThatControlsDescendantBindings +
 " and " + bindingKey + ") are trying to control descendant bindings of the same element. You cannot use these bindings together on the same element.");
                        bindingHandlerThatControlsDescendantBindings = bindingKey;
                    }
                }
            }
            initPhase = 2;
        }
        if (initPhase === 2) {
            for (var bindingKey in parsedBindings) {
                var binding = ko.bindingHandlers[bindingKey];
                if (binding && typeof binding["update"] == "function") {
                    var handlerUpdateFn = binding["update"];//更新UI
                    handlerUpdateFn(node, makeValueAccessor(bindingKey), parsedBindingsAccessor, viewModel, bindingContextInstance);
                }
            }
        }
    }
}

这里存在一个疑惑，像value, checked, event等命令是要绑定事件的，但很难想象事件的回调是怎么调用到这匿名函数的。下一节将深入到其发布者订阅者机制看看。







-----------------------------------------------------------------

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



-----------------------------------------------------------------
 knockout.js的学习笔记3

上一节主要是说viewModel各个域中相互通知，本节开始介绍viewModel与节点的相互通知。

我们在body上添加如下HTML片断：

  The name is <span data-bind="text: fullName" id="node"></span>

然后将第一节提到的$.applyBindings疯狂删减到这样：

             $.applyBindings = function(model, node){
                var str = node.getAttribute("data-bind");
                str = "{"+str+"}"
                var bindings = eval("0,"+str);
                for(var key in bindings){//如果直接eval肯定会报错,因为它找到fullName
                    console.log(key)
                }
            }
            window.onload = function(){
                var model = new MyViewModel();
                var node = document.getElementById("node");
                $.applyBindings(model, node)
            }

意料中的失败，因为fullName在window中找不到。knockoutjs里面有一个叫buildEvalWithinScopeFunction处理此问题：

       $.buildEvalWithinScopeFunction =  function (expression, scopeLevels) {
            var functionBody = "return (" + expression + ")";
            for (var i = 0; i < scopeLevels; i++) {
                functionBody = "with(sc[" + i + "]) { " + functionBody + " } ";
            }
            return new Function("sc", functionBody);
        }

然后将applyBindings 改成这样:

            $.applyBindings = function(model, node){
                var str = node.getAttribute("data-bind");
                str = "{"+str+"}"
                var fn = $.buildEvalWithinScopeFunction(str,2);
                var bindings = fn([node,model])
                console.log(bindings.text == model.fullName)//到这里我们就把viewModel与节点关联起来了
            }

在data-bind定义两个东西,一个是viewModel中的域，另一个是对应的操作，在这里是text！在knockout中有一个叫ko.bindingHandlers的对象，里面储放着各种操作，格式如下：

ko.bindingHandlers['event'] = {
    'init' : function (element, valueAccessor, allBindingsAccessor, viewModel) { }
};

ko.bindingHandlers['submit'] = {
    'init': function (element, valueAccessor, allBindingsAccessor, viewModel) { }
};

ko.bindingHandlers['visible'] = {
    'update': function (element, valueAccessor) { }
}

ko.bindingHandlers['enable'] = {
    'update': function (element, valueAccessor) { }
};

ko.bindingHandlers['disable'] = {
    'update': function (element, valueAccessor) { }
};

ko.bindingHandlers['value'] = {
    'init': function (element, valueAccessor, allBindingsAccessor) { },
    'update': function (element, valueAccessor) { }
};

ko.bindingHandlers['options'] = {
    'update': function (element, valueAccessor, allBindingsAccessor) { }
};

ko.bindingHandlers['selectedOptions'] = {
    'init': function (element, valueAccessor, allBindingsAccessor) { },
    'update': function (element, valueAccessor) { }
};

ko.bindingHandlers['text'] = {
    'update': function (element, valueAccessor) {
        ko.utils.setTextContent(element, valueAccessor());
    }
};

ko.bindingHandlers['html'] = {
    'init': function() {
        return { 'controlsDescendantBindings': true };
    },
    'update': function (element, valueAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());
            ko.utils.setHtml(element, value);
    }
};

init可以猜测是用于第一次绑定元素时调用的，update是每次viewModel调用的。

现在我们是玩玩，不用大动干戈。

          $.applyBindings = function(model, node){
                var str = node.getAttribute("data-bind");
                str = "{"+str+"}"
                var fn = $.buildEvalWithinScopeFunction(str,2);
                var bindings = fn([node,model]);
                for(var key in bindings){
                    if(bindings.hasOwnProperty(key)){
                        var fn = $.bindingHandlers["text"]["update"];
                        fn(node,bindings[key])
                    }
                }
            }
            $.bindingHandlers = {}
            $.bindingHandlers["text"] = {
                'update': function (node, observable) {
                    var val = observable()
                    val = val == null ? "" : val+"";
                    if("textContent" in node){//优先考虑标准属性textContent
                        node.textContent = val;
                    }else{
                        node.innerText = val;
                    }
                    //处理IE9的渲染BUG
                    if (document.documentMode == 9) {
                        node.style.display = node.style.display;
                    }

                }
            }
            window.onload = function(){
                var model = new MyViewModel();
                var node = document.getElementById("node");
                $.applyBindings(model, node);
            }

到这里，我们就可以把Planet Earth正确地显示在span中，但当viewModel中的FullName发生改变时，span并没有发生改变，缘由是我们没有把它们绑在一起。很简单，我们把$.applyBindings里面的逻辑都整进一个$.computed 中就行了。


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
                            self.list = self.list || [];
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
                                $.valueWillMutate(ret);//向依赖者发送通知
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
            }
            $.buildEvalWithinScopeFunction =  function (expression, scopeLevels) {
                var functionBody = "return (" + expression + ")";
                for (var i = 0; i < scopeLevels; i++) {
                    functionBody = "with(sc[" + i + "]) { " + functionBody + " } ";
                }
                return new Function("sc", functionBody);
            }
            $.applyBindings = function(model, node){       
              
                var nodeBind = $.computed(function (){
                    var str = "{" + node.getAttribute("data-bind")+"}"
                    var fn = $.buildEvalWithinScopeFunction(str,2);
                    var bindings = fn([node,model]);
                    for(var key in bindings){
                        if(bindings.hasOwnProperty(key)){
                            var fn = $.bindingHandlers["text"]["update"];
                            var observable = bindings[key]
                            $.dependencyDetection.collect(observable);//绑定viewModel与UI
                            fn(node, observable)
                        }
                    }
                },node);
                return nodeBind
                
            }
            $.bindingHandlers = {}
            $.bindingHandlers["text"] = {
                'update': function (node, observable) {
                    var val = observable()
                    val = val == null ? "" : val+"";
                    if("textContent" in node){//优先考虑标准属性textContent
                        node.textContent = val;
                    }else{
                        node.innerText = val;
                    }
                    //处理IE9的渲染BUG
                    if (document.documentMode == 9) {
                        node.style.display = node.style.display;
                    }

                }
            }
            window.onload = function(){
                var model = new MyViewModel();
                var node = document.getElementById("node");
                var nodeBind = $.applyBindings(model, node);
                $.log("+++++++++++++++++++++++++++")
                $.log(model.fullName.list[0] == nodeBind);
                $.log(model.lastName.list[0] == model.fullName);
                $.log(model.firstName.list[0] == model.fullName);
                //  $.log(model.lastName.list[0] == model.fullName)
                setTimeout(function(){
                    model.fullName("xxx yyy")
                },1500)
                setTimeout(function(){
                    model.fullName("111 222")
                },3000)
            }

大家可以下载回来看看效果：点我


-----------------------------------------------------------------
 knockout.js的学习笔记4

本节对第三节的代码进行重构一下。

我们发现$.computed其实也是一种$.observable，因此可以写成这样：
var validValueType = $.oneObject("Null,NaN,Undefined,Boolean,Number,String")
$.dependencyChain = (function () {
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
                self.list = self.list || [];
                var fn = _frames[_frames.length - 1];
                if ( self.list.indexOf( fn ) >= 0)
                    return;
                self.list.push(fn);
            }
        }
    };
})();
$.notifyUpdate = function(observable){
    var list = observable.list
    if($.type(list,"Array")){
        for(var i = 0, el; el = list[i++];){
            el();//通知顶层的computed更新自身
        }
    }
}
$.computed = function(obj, scope){
    var args//构建一个至少拥有getter,scope属性的对象
    if(typeof obj == "function"){
        args = {
            getter: obj,
            scope: scope
        }
    }else if( typeof obj == "object" && obj && obj.getter){
        args = obj
    }
    return $.observable(args, true)
}
 
$.observable = function(old, isComputed){
    var cur, getter, setter, scope
    function ret(neo){
        var set;//判定是读方法还是写方法
        if(arguments.length){ //setter
            neo =  typeof setter === "function" ? setter.call( scope, neo ) : neo
            set = true;
        }else{  //getter
            if(typeof getter === "function"){
                $.dependencyChain.begin(ret);//只有computed才在依赖链中暴露自身
                neo = getter.call( scope )
                console.log(neo+"!!!!!!!!!!")//用来查看执行情况
                $.dependencyChain.end()
            }else{
                neo = cur
            }
            $.dependencyChain.collect(ret)//将暴露到依赖链的computed放到自己的通知列表中
        }
        if(cur !== neo ){
            cur = neo;
            $.notifyUpdate(ret)
        }
        return set ? ret : cur
    }
    if( isComputed == true){
        getter = old.getter;  setter = old.setter; scope  = old.scope;
        ret();//必须先执行一次
    }else{
        old = validValueType[$.type(old)] ? old : void 0;
        cur = old;//将上一次的传参保存到cur中,ret与它构成闭包
        ret(old);//必须先执行一次
    }
    return ret
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
    },this);
    this.wordcard = $.computed(function(){
        return this.card() +"工作卡 "
    },this)
    this.wordcardA = $.computed(function(){
        return this.wordcard() +"A "
    },this)
}
 
window.onload = function(){
    var model = new MyViewModel();
 
    $.log("==================")
    model.lastName("last");
    $.log("==================")
 
}

打印如下：
Planet Earth 屌丝!!!!!!!!!!
Planet Earth 屌丝工作卡 !!!!!!!!!!
Planet Earth!!!!!!!!!!
Planet Earth 屌丝!!!!!!!!!!
Planet Earth 屌丝工作卡 !!!!!!!!!!
Planet Earth 屌丝工作卡 A !!!!!!!!!!
==================
Planet last!!!!!!!!!!
Planet last!!!!!!!!!!
Planet last 屌丝!!!!!!!!!!
Planet last!!!!!!!!!!
Planet last 屌丝!!!!!!!!!!
Planet last 屌丝工作卡 !!!!!!!!!!
Planet last!!!!!!!!!!
Planet last 屌丝!!!!!!!!!!
Planet last 屌丝工作卡 !!!!!!!!!!
Planet last 屌丝工作卡 A !!!!!!!!!!
==================

依赖链发生效力了！不过感觉糟极了，有许多通知是没必要的。我们在$.notifyUpdate与$.observable添加缓存机制看看：
$.notifyUpdate = function(observable){
                var list = observable.list;
                if($.type(list,"Array")){
                    for(var i = 0, el; el = list[i++];){
                        delete el.cache;//清除缓存
                        el();//通知顶层的computed更新自身
                    }
                }
            }
//**********************略***************  
 $.observable = function(old, isComputed){
//**********************略***************  
 function ret(neo){
                    var set;//判定是读方法还是写方法
                    if(arguments.length){ //setter
                        neo =  typeof setter === "function" ? setter.apply( scope, arguments ) : neo
                        set = true;
                    }else{  //getter
                        if(typeof getter === "function"){
                            $.dependencyChain.begin(ret);//只有computed才在依赖链中暴露自身
                            if("cache" in ret){
                                neo = ret.cache;//从缓存中读取,防止递归
                            }else{
                                neo = getter.call( scope );
                                ret.cache = neo;//保存到缓存
                                console.log(neo+"!!!!!!!!!!");//
                            }
                            $.dependencyChain.end()
                        }else{
                            neo = cur
                        }
                        $.dependencyChain.collect(ret)//将暴露到依赖链的computed放到自己的通知列表中
                    }
                    if(cur !== neo ){
                        cur = neo;
                        $.notifyUpdate(ret);
                    }
                    return set ? ret : cur
                }
//**********************略***************  
                if( isComputed == true){
                    getter = old.getter;  setter = old.setter; scope  = old.scope;
                    ret();//必须先执行一次
                }else{
                    old = validValueType[$.type(old)] ? old : void 0;
                    cur = old;//将上一次的传参保存到cur中,ret与它构成闭包
                    ret(old);//必须先执行一次
                }
                return ret
}

这时它的情况就好多了：
Planet
Earth
Planet Earth!!!!!!!!!!
Planet Earth 屌丝!!!!!!!!!!
Planet Earth 屌丝工作卡 !!!!!!!!!!
Planet Earth 屌丝工作卡 A !!!!!!!!!!
==================
Planet last!!!!!!!!!!
Planet last 屌丝!!!!!!!!!!
Planet last 屌丝工作卡 !!!!!!!!!!
Planet last 屌丝工作卡 A !!!!!!!!!!
==================