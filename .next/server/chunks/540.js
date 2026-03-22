exports.id=540,exports.ids=[540],exports.modules={4285:(e,t,r)=>{Promise.resolve().then(r.t.bind(r,2994,23)),Promise.resolve().then(r.t.bind(r,6114,23)),Promise.resolve().then(r.t.bind(r,9727,23)),Promise.resolve().then(r.t.bind(r,9671,23)),Promise.resolve().then(r.t.bind(r,1868,23)),Promise.resolve().then(r.t.bind(r,4759,23))},5165:()=>{},2663:(e,t,r)=>{Promise.resolve().then(r.bind(r,7676))},3102:(e,t,r)=>{"use strict";r.d(t,{Header:()=>a});var s=r(326);function a({title:e,profile:t}){return s.jsx("header",{className:"bg-white border-b border-gray-200 px-6 py-4",children:(0,s.jsxs)("div",{className:"flex items-center justify-between",children:[s.jsx("div",{children:s.jsx("h1",{className:"text-xl font-semibold text-gray-900",children:e})}),s.jsx("div",{className:"flex items-center gap-3",children:t&&s.jsx("span",{className:"text-sm text-gray-500",children:t.full_name})})]})})}},7676:(e,t,r)=>{"use strict";r.d(t,{Sidebar:()=>p});var s=r(326),a=r(434),l=r(5047),i=r(4319),n=r(6283),o=r(8932),d=r(4061),c=r(6343),h=r(9183),m=r(1810),u=r(9701),x=r(5342);let g=[{href:"/dashboard",label:"ダッシュボード",icon:i.Z},{href:"/workpapers",label:"調書一覧",icon:n.Z},{href:"/projects",label:"プロジェクト管理",icon:o.Z,roles:["admin"]},{href:"/users",label:"ユーザー管理",icon:d.Z,roles:["admin"]}];function p({profile:e}){let t=(0,l.usePathname)(),r=(0,l.useRouter)(),i=(0,u.e)(),n=async()=>{await i.auth.signOut(),r.push("/login"),r.refresh()},o=g.filter(t=>!t.roles||t.roles.includes(e.role));return(0,s.jsxs)("div",{className:"flex flex-col h-full bg-gray-900 text-white w-64 shrink-0",children:[(0,s.jsxs)("div",{className:"flex items-center gap-3 px-6 py-5 border-b border-gray-700",children:[s.jsx(c.Z,{className:"h-7 w-7 text-blue-400"}),(0,s.jsxs)("div",{children:[s.jsx("p",{className:"font-semibold text-sm leading-tight",children:"電子調書"}),s.jsx("p",{className:"text-xs text-gray-400 leading-tight",children:"管理システム"})]})]}),s.jsx("nav",{className:"flex-1 px-3 py-4 space-y-1 overflow-y-auto",children:o.map(e=>{let r=e.icon,l=t===e.href||"/dashboard"!==e.href&&t.startsWith(e.href);return(0,s.jsxs)(a.default,{href:e.href,className:`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors duration-150 group
                ${l?"bg-blue-600 text-white":"text-gray-300 hover:bg-gray-800 hover:text-white"}
              `,children:[s.jsx(r,{className:"h-5 w-5 shrink-0"}),s.jsx("span",{className:"flex-1",children:e.label}),l&&s.jsx(h.Z,{className:"h-4 w-4"})]},e.href)})}),(0,s.jsxs)("div",{className:"px-4 py-4 border-t border-gray-700",children:[(0,s.jsxs)("div",{className:"flex items-center gap-3 mb-3",children:[s.jsx("div",{className:"h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-semibold shrink-0",children:e.full_name.charAt(0)}),(0,s.jsxs)("div",{className:"flex-1 min-w-0",children:[s.jsx("p",{className:"text-sm font-medium truncate",children:e.full_name}),s.jsx("p",{className:"text-xs text-gray-400",children:x.Sx[e.role]})]})]}),(0,s.jsxs)("button",{onClick:n,className:"flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors",children:[s.jsx(m.Z,{className:"h-4 w-4"}),s.jsx("span",{children:"ログアウト"})]})]})]})}},9701:(e,t,r)=>{"use strict";r.d(t,{e:()=>a});var s=r(861);function a(){return(0,s.createBrowserClient)("https://ejsgzzftkoqpgivfasqf.supabase.co","sb_publishable_9LibImHAbiInbFUSxNKEeA_3yw5XZii")}},5342:(e,t,r)=>{"use strict";r.d(t,{NK:()=>s,Sx:()=>a});let s={not_started:"未着手",in_progress:"作成中",pending_review:"査閲待ち",completed:"完了"},a={creator:"作成者",reviewer:"査閲者",admin:"管理者"}},7162:(e,t,r)=>{"use strict";r.d(t,{Z:()=>o});var s=r(1159);/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),l=(...e)=>e.filter((e,t,r)=>!!e&&r.indexOf(e)===t).join(" ");/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var i={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,s.forwardRef)(({color:e="currentColor",size:t=24,strokeWidth:r=2,absoluteStrokeWidth:a,className:n="",children:o,iconNode:d,...c},h)=>(0,s.createElement)("svg",{ref:h,...i,width:t,height:t,stroke:e,strokeWidth:a?24*Number(r)/Number(t):r,className:l("lucide",n),...c},[...d.map(([e,t])=>(0,s.createElement)(e,t)),...Array.isArray(o)?o:[o]])),o=(e,t)=>{let r=(0,s.forwardRef)(({className:r,...i},o)=>(0,s.createElement)(n,{ref:o,iconNode:t,className:l(`lucide-${a(e)}`,r),...i}));return r.displayName=`${e}`,r}},2688:(e,t,r)=>{"use strict";r.d(t,{Z:()=>s});/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,r(7162).Z)("Calendar",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["rect",{width:"18",height:"18",x:"3",y:"4",rx:"2",key:"1hopcy"}],["path",{d:"M3 10h18",key:"8toen8"}]])},3113:(e,t,r)=>{"use strict";r.d(t,{Z:()=>s});/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,r(7162).Z)("FileText",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]])},4710:(e,t,r)=>{"use strict";r.d(t,{Z:()=>s});/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,r(7162).Z)("FolderOpen",[["path",{d:"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",key:"usdka0"}]])},7956:(e,t,r)=>{"use strict";r.d(t,{Z:()=>s});/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,r(7162).Z)("Lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]])},4126:(e,t,r)=>{"use strict";r.d(t,{Z:()=>s});/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=(0,r(7162).Z)("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]])},7371:(e,t,r)=>{"use strict";r.d(t,{default:()=>a.a});var s=r(1812),a=r.n(s)},1812:(e,t,r)=>{"use strict";let{createProxy:s}=r(8570);e.exports=s("/home/cosy/audit-workpaper/node_modules/next/dist/client/link.js")},1804:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>m,dynamic:()=>h});var s=r(9510),a=r(5655),l=r(8585),i=r(8570);let n=(0,i.createProxy)(String.raw`/home/cosy/audit-workpaper/src/components/layout/Sidebar.tsx`),{__esModule:o,$$typeof:d}=n;n.default;let c=(0,i.createProxy)(String.raw`/home/cosy/audit-workpaper/src/components/layout/Sidebar.tsx#Sidebar`),h="force-dynamic";async function m({children:e}){let t=(0,a.e)(),{data:{user:r}}=await t.auth.getUser();r||(0,l.redirect)("/login");let{data:i}=await t.from("profiles").select("*").eq("id",r.id).single(),n=i;if(!n){let{data:e}=await t.from("profiles").insert({id:r.id,email:r.email??"",full_name:r.user_metadata?.full_name||r.email?.split("@")[0]||"ユーザー",role:"creator"}).select().single();e||(0,l.redirect)("/login"),n=e}return(0,s.jsxs)("div",{className:"flex h-screen overflow-hidden",children:[s.jsx(c,{profile:n}),s.jsx("div",{className:"flex-1 flex flex-col overflow-hidden",children:s.jsx("main",{className:"flex-1 overflow-y-auto bg-gray-50",children:e})})]})}},2029:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>l,metadata:()=>a});var s=r(9510);r(5023);let a={title:"電子調書管理システム",description:"監査調書の作成・管理・査閲のためのシステム"};function l({children:e}){return(0,s.jsxs)("html",{lang:"ja",children:[(0,s.jsxs)("head",{children:[s.jsx("link",{rel:"preconnect",href:"https://fonts.googleapis.com"}),s.jsx("link",{rel:"preconnect",href:"https://fonts.gstatic.com",crossOrigin:"anonymous"}),s.jsx("link",{href:"https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap",rel:"stylesheet"})]}),s.jsx("body",{className:"font-sans antialiased bg-gray-50 text-gray-900",children:e})]})}},8246:(e,t,r)=>{"use strict";r.d(t,{h:()=>n});var s=r(8570);let a=(0,s.createProxy)(String.raw`/home/cosy/audit-workpaper/src/components/layout/Header.tsx`),{__esModule:l,$$typeof:i}=a;a.default;let n=(0,s.createProxy)(String.raw`/home/cosy/audit-workpaper/src/components/layout/Header.tsx#Header`)},9714:(e,t,r)=>{"use strict";r.d(t,{C:()=>l});var s=r(9510);r(1159);let a={gray:"bg-gray-100 text-gray-700",blue:"bg-blue-100 text-blue-700",yellow:"bg-yellow-100 text-yellow-700",green:"bg-green-100 text-green-700",red:"bg-red-100 text-red-700",purple:"bg-purple-100 text-purple-700",orange:"bg-orange-100 text-orange-700"};function l({color:e="gray",children:t,className:r=""}){return s.jsx("span",{className:`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${a[e]}
        ${r}
      `,children:t})}},1781:(e,t,r)=>{"use strict";r.d(t,{z:()=>n});var s=r(9510);r(1159);/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(7162).Z)("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]),l={primary:"bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 border-transparent",secondary:"bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 border-transparent",outline:"bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500 border-gray-300",ghost:"bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 border-transparent",danger:"bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border-transparent"},i={sm:"px-3 py-1.5 text-sm",md:"px-4 py-2 text-sm",lg:"px-6 py-3 text-base"};function n({variant:e="primary",size:t="md",loading:r=!1,disabled:n,children:o,className:d="",...c}){return(0,s.jsxs)("button",{disabled:n||r,className:`
        inline-flex items-center justify-center gap-2 font-medium rounded-md
        border transition-colors duration-150
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${l[e]}
        ${i[t]}
        ${d}
      `,...c,children:[r&&s.jsx(a,{className:"h-4 w-4 animate-spin"}),o]})}},5502:(e,t,r)=>{"use strict";r.d(t,{Ol:()=>i,Zb:()=>l,ll:()=>n});var s=r(9510);r(1159);let a={none:"",sm:"p-4",md:"p-6",lg:"p-8"};function l({children:e,className:t="",padding:r="md"}){return s.jsx("div",{className:`
        bg-white rounded-lg border border-gray-200 shadow-sm
        ${a[r]}
        ${t}
      `,children:e})}function i({children:e,className:t=""}){return s.jsx("div",{className:`flex items-center justify-between mb-4 ${t}`,children:e})}function n({children:e,className:t=""}){return s.jsx("h3",{className:`text-lg font-semibold text-gray-900 ${t}`,children:e})}},5655:(e,t,r)=>{"use strict";r.d(t,{e:()=>l});var s=r(7721),a=r(1615);function l(){let e=(0,a.cookies)();return(0,s.createServerClient)("https://ejsgzzftkoqpgivfasqf.supabase.co","sb_publishable_9LibImHAbiInbFUSxNKEeA_3yw5XZii",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:s})=>e.set(t,r,s))}catch{}}}})}},5023:()=>{}};