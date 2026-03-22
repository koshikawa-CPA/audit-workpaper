(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[642],{1021:function(e,t,r){Promise.resolve().then(r.bind(r,6775))},6540:function(e,t,r){"use strict";r.d(t,{Z:function(){return s}});/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,r(8030).Z)("BookOpen",[["path",{d:"M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z",key:"vv98re"}],["path",{d:"M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",key:"1cyq3y"}]])},7592:function(e,t,r){"use strict";r.d(t,{Z:function(){return s}});/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,r(8030).Z)("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]])},2023:function(e,t,r){"use strict";r.d(t,{Z:function(){return s}});/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,r(8030).Z)("FileText",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]])},7138:function(e,t,r){"use strict";r.d(t,{default:function(){return a.a}});var s=r(231),a=r.n(s)},6775:function(e,t,r){"use strict";r.d(t,{Sidebar:function(){return m}});var s=r(7437),a=r(7138),n=r(6463),i=r(8030);/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let l=(0,i.Z)("LayoutDashboard",[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]]);var c=r(2023);/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let h=(0,i.Z)("FolderOpen",[["path",{d:"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",key:"usdka0"}]]),o=(0,i.Z)("Users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]]);var d=r(6540),u=r(7592);/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let x=(0,i.Z)("LogOut",[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",key:"1uf3rs"}],["polyline",{points:"16 17 21 12 16 7",key:"1gabdz"}],["line",{x1:"21",x2:"9",y1:"12",y2:"12",key:"1uyos4"}]]);var f=r(2157),y=r(4451);let p=[{href:"/dashboard",label:"ダッシュボード",icon:l},{href:"/workpapers",label:"調書一覧",icon:c.Z},{href:"/projects",label:"プロジェクト管理",icon:h,roles:["admin"]},{href:"/users",label:"ユーザー管理",icon:o,roles:["admin"]}];function m(e){let{profile:t}=e,r=(0,n.usePathname)(),i=(0,n.useRouter)(),l=(0,f.e)(),c=async()=>{await l.auth.signOut(),i.push("/login"),i.refresh()},h=p.filter(e=>!e.roles||e.roles.includes(t.role));return(0,s.jsxs)("div",{className:"flex flex-col h-full bg-gray-900 text-white w-64 shrink-0",children:[(0,s.jsxs)("div",{className:"flex items-center gap-3 px-6 py-5 border-b border-gray-700",children:[(0,s.jsx)(d.Z,{className:"h-7 w-7 text-blue-400"}),(0,s.jsxs)("div",{children:[(0,s.jsx)("p",{className:"font-semibold text-sm leading-tight",children:"電子調書"}),(0,s.jsx)("p",{className:"text-xs text-gray-400 leading-tight",children:"管理システム"})]})]}),(0,s.jsx)("nav",{className:"flex-1 px-3 py-4 space-y-1 overflow-y-auto",children:h.map(e=>{let t=e.icon,n=r===e.href||"/dashboard"!==e.href&&r.startsWith(e.href);return(0,s.jsxs)(a.default,{href:e.href,className:"\n                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium\n                transition-colors duration-150 group\n                ".concat(n?"bg-blue-600 text-white":"text-gray-300 hover:bg-gray-800 hover:text-white","\n              "),children:[(0,s.jsx)(t,{className:"h-5 w-5 shrink-0"}),(0,s.jsx)("span",{className:"flex-1",children:e.label}),n&&(0,s.jsx)(u.Z,{className:"h-4 w-4"})]},e.href)})}),(0,s.jsxs)("div",{className:"px-4 py-4 border-t border-gray-700",children:[(0,s.jsxs)("div",{className:"flex items-center gap-3 mb-3",children:[(0,s.jsx)("div",{className:"h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-semibold shrink-0",children:t.full_name.charAt(0)}),(0,s.jsxs)("div",{className:"flex-1 min-w-0",children:[(0,s.jsx)("p",{className:"text-sm font-medium truncate",children:t.full_name}),(0,s.jsx)("p",{className:"text-xs text-gray-400",children:y.Sx[t.role]})]})]}),(0,s.jsxs)("button",{onClick:c,className:"flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors",children:[(0,s.jsx)(x,{className:"h-4 w-4"}),(0,s.jsx)("span",{children:"ログアウト"})]})]})]})}},2157:function(e,t,r){"use strict";r.d(t,{e:function(){return a}});var s=r(6038);function a(){return(0,s.createBrowserClient)("https://ejsgzzftkoqpgivfasqf.supabase.co","sb_publishable_9LibImHAbiInbFUSxNKEeA_3yw5XZii")}},4451:function(e,t,r){"use strict";r.d(t,{NK:function(){return s},Sx:function(){return a}});let s={not_started:"未着手",in_progress:"作成中",pending_review:"査閲待ち",completed:"完了"},a={creator:"作成者",reviewer:"査閲者",admin:"管理者"}}},function(e){e.O(0,[454,231,971,23,744],function(){return e(e.s=1021)}),_N_E=e.O()}]);