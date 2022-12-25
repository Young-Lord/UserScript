// ==UserScript==
// @name         Coursera课程翻译
// @namespace    https://viayoo.com/
// @version      0.1
// @description  a
// @author       You
// @run-at       document-idle
// @match        https://www.coursera.org/learn/*
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

(function() {
    'use strict';
var has_send=false;
var has_added=false;
//var try_count=1;
async function open_with_check(){
if(!has_send){has_send=true;await openBilingual();}
}
async function openBilingual () {
  //window.unsafeWindow.via.toast(try_count);try_count+=1;
  let tracks = document.getElementsByTagName('track')
  let en
  let zhcn
  if (tracks.length) {
    // 1. 遍历字幕节点，找到中英文字幕
    for (let i = 0; i < tracks.length; i++) {
      if (tracks[i].srclang === 'en') {
        en = tracks[i]
      } else if (tracks[i].srclang === 'zh-CN') {
        zhcn = tracks[i]
      }
    }
    // 2. 如果英文字幕存在，打开
    if (en) {
      en.track.mode = 'showing'
      // 3. 判定中文字幕是否存在, 如果存在，直接打开
      if (zhcn) {
        zhcn.track.mode = 'showing'
      } else {
        // 4. 如果不存在，开启翻译
        // Chrome 更新到 74 以后
        // 似乎首次设置 track.mode = 'showing' 到 cues 加载完毕之间有延迟？
        // 暂时先用 sleep 让 cues 有充足的时间加载字幕以确保正常工作，稍后再来解决
        await sleep(100)
        let cues = en.track.cues
        if(cues.length===0 || cues.loaded_trans===true){has_send=false;setTimeout(()=>{open_with_check()},1000);return;}
        cues.loaded_trans=true;//加一个翻译过的标记，否则会把旧的翻译版本当成新的不用翻
        // 由于逐句翻译会大量请求翻译 API，需要减少请求次数
        const cuesTextList = getCuesTextList(cues)
        // 进行翻译
        for (let i = 0; i < cuesTextList.length; i++) {
          getTranslation(cuesTextList[i][1], translatedText => {
            // 取得返回的文本，根据之前插入的换行符 split
            // 然后确定所在 cues 文本的序列，为之前存储的起始位置 + 目前的相对位置
            // 把翻译后的文本直接添加到英文字幕后面
            const translatedTextList = translatedText.split('\n\n')
            for (let j = 0; j < translatedTextList.length; j++) {
              cues[cuesTextList[i][0] + j].text += '\n' + translatedTextList[j]
            }
          })
        }
      }
    }
  }
  else{has_send=false;setTimeout(()=>{open_with_check()},1000)}
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getCuesTextList (cues) {
  // 取出字幕的所有文本内容，整合成为一个列表
  // 每项为不大于 5000 字的字符串，（好像目前使用的这个 API 有 5000 字上限？）
  // 以及它在 cues 的起始位置
  // 返回的数据结构大概是 [[0, 文本], [95, 文本]]
  let cuesTextList = []
  for (let i = 0; i < cues.length; i++) {
    if (cuesTextList.length &&
        cuesTextList[cuesTextList.length - 1][1].length +
        cues[i].text.length < 5000) {
      // 需要插入一个分隔符(换行)，以便之后为翻译完的字符串 split
      // 用两个换行符来分割，因为有的视频字幕是自带换行符
      cuesTextList[cuesTextList.length - 1][1] += '\n\n' + cues[i].text
    } else {
      cuesTextList.push([i, cues[i].text])
    }
  }
  return cuesTextList
}

function getTranslation (words, callback) {
  //window.unsafeWindow.via.toast("getT"+try_count);try_count+=1;
  // 通过谷歌翻译 API 进行翻译，输入待翻译的字符串，返回翻译完成的字符串
  const xhr = new XMLHttpRequest()
  let url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh&dt=t&q=${encodeURI(words)}`
  xhr.open('GET', url, true)
  xhr.responseType = 'text'
  xhr.onload = function () {
    if (xhr.readyState === xhr.DONE) {
      if (xhr.status === 200 || xhr.status === 304) {
        console.log("success.")
        has_send=true;
        if(has_added){return;}
        has_added=true;
        // 返回的翻译文本大概是
        // [[["你好。","hello.",null,null,1],["你好","hello",null,null,1]],null,"en"]
        // 这样的字符串
        // 需要将结果拼接成完整的整段字符串
        const translatedList = JSON.parse(xhr.responseText)[0]
        let translatedText = ''
        for (let i = 0; i < translatedList.length; i++) {
          translatedText += translatedList[i][0]
        }
        callback(translatedText)
      }
      else{
        console.log(xhr.status)
        console.log("fail!")
has_send=false;setTimeout(()=>{open_with_check()},1000)
      }
    }
  }
  console.log("sending req...")
  xhr.send()
}
setTimeout(()=>{open_with_check();},2000)


var _wr = function(type) {
   var orig = history[type];
   return function() {
       var rv = orig.apply(this, arguments);
      var e = new Event(type);
       e.arguments = arguments;
       window.dispatchEvent(e);
       return rv;
   };
};
 history.pushState = _wr('pushState');
window.addEventListener('pushState', function(e) {
  has_send=false;setTimeout(()=>{open_with_check()},1000)
});
//监听更新，https://juejin.cn/post/6844903749421367303

})();