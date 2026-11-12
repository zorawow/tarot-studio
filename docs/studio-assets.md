# 书房素材

## 手机无框取景

`public/studio/room-mobile-open.webp` 是手机端独立室内层，1672 × 941。内置 ImageGen 以现有室内图为参考移除门柱、把手与轨道，保留窗帘、扶手椅和地板。透明开口继续显示独立窗景图层。

> Use case: precise-object-edit, transparent background extraction. Make a minimal edit to the exact hand-painted 16:9 room in the provided image. Completely REMOVE ALL wooden and metal glass-door framing from the open space between the two cream linen curtains. Remove the thick vertical mullions at around 36% and 88% horizontal, remove both door handles, remove the upper horizontal crossbars and rails, and remove the bottom door tracks; replace the narrow sill at the floor by the continuing painted floor edge with no visible door track. The entire former window/door zone is now ONE uninterrupted transparent opening from curtain edge to curtain edge, from top edge to the floor boundary, for an independently rendered landscape behind it. Replace the pixels of the removed frames with genuine alpha=0, not with any drawn object, glass, sky, backdrop, colored gradient or checkerboard. Keep the original cream curtains, armchair and hanging knitted blanket, plant, warm lamp, left bookshelf, floor boards, and rug in the exact same size, positions and perspective. The left chair and plant must be unchanged, especially their right edges. Keep the source 16:9 wide framing, warm illustrated painting style and side silhouettes. No text, no new furniture. The left curtain and chair and the warm floor alone frame the transparent landscape opening; there are no posts or bars running through that opening.


## 方桌版素材

使用内置 ImageGen 分别制作延伸地板的室内层、透明方桌和三本书的独立书叠。三张素材用 WebP 保存，窗洞、桌腿间隙和书叠轮廓保留透明通道。

| 运行文件 | 尺寸 | 用途 |
| --- | --- | --- |
| `public/studio/room-open-floor.webp` | 1672 × 941 | 延伸至画面底部的地板和地毯，透明窗洞保留。 |
| `public/studio/square-table.webp` | 1200 × 800 | 完整方桌的独立图层，桌面实际轮廓约为 `(20%,6%) (80%,6%) (92%,51%) (8%,51%)`。 |
| `public/studio/book-stack.webp` | 600 × 600 | 苔绿、赭红、靛蓝三本叠书，作为塔罗学院入口。 |

### 延伸地板

> Use case: precise-object-edit. Same 16:9 hand-painted room background as the reference, with a genuinely transparent alpha channel in all existing empty window panes. Make only one edit: entirely REMOVE the wide foreground horizontal tabletop covering the bottom 18% of the picture (the single horizontal line across the entire image at about y=82%). Extend the room's existing natural wood-plank floor in accurate perspective, and extend the woven jute rug at the center beneath it, down to the bottom edge. Leave the bottom foreground completely open, so a separate square desk will be layered on top later. Preserve positions and dimensions of the window frames, curtains, side bookshelf, hanging vine, warm lamp, armchair, window opening and lighting. Keep identical illustrated gouache style, no objects added, no lettering. The window pane holes remain genuinely empty transparent alpha like the reference, no view or tinted fill, and the extended FLOOR is fully opaque. No furniture in the newly exposed lower foreground.

### 方桌

> Use case: illustration-story, transparent cutout game prop. Make ONE empty freestanding small square walnut table for the matching hand-painted anime reading room in the reference. Only the entire table itself on a genuinely transparent alpha background. Paint in the same warm stylized gouache with refined walnut grain, honey-colored sunlight from upper right, and dark carved wood. Camera looks down at the top from centered first-person seated view and slightly above, nearly symmetric front-facing composition: see all FOUR corners of the square tabletop, foreshortened as a trapezoid with back corners inset, long nearly horizontal front edge, left and right edges diverging toward the viewer. In frame composition let back edge around 8% from top, near/front tabletop edge around 64% height, subtle front apron at 67–73%, TWO graceful visible front legs down to 96% frame height. Small distant legs if visible. Fit the entire table within frame with only 4–6% transparent margins; no clipped corners or legs. Wide 3:2 horizontal canvas. Table top is absolutely empty, ample clean wood for five web sprites to be layered on it. No props, drawers, carpet, floor, scenery, letters, or text. Only the standalone coherent object; genuine transparency including the gaps under and around table and between its legs.

### 书叠

> Use case: illustration-story, transparent isolated game prop. Create ONLY a neatly informal stack of THREE closed old hardcover books lying flat on top of each other, slightly offset, for the illustrated tarot study scene. Match the gouache and cel-painted small tabletop props in the reference. The uppermost book is the illustrated moss-green clothbound book with a subtle gold botanical branch ornament, next one dusty sienna with cream pages, lower larger indigo cloth with paper edges. View obliquely from above and a little from the front, near front-facing camera, top visible and three distinct spines or page blocks. Refined warm brushwork and discreet highlights, sunlight from upper right, convincing tabletop scale. Centered compact object in a square image with small transparent margins. No other objects, no lettering, no table, no floor, no painted glow outside object. True transparent alpha around the stack.


## 插画版生成提示词

本轮以原室内、窗景和物件图为编辑参考，通过内置 ImageGen 输出插画版。

### 室内

> Use case: style-transfer. Redraw this exact panoramic window-side tarot reading room cutout as an exquisite hand-painted 2D animation background in gouache and cel paint. Preserve its original composition and window opening boundaries exactly: large clear central window cutout and slender side openings stay genuinely transparent alpha, preserve mullions, left shelf, climbing vine, brass amber lamp, cream armchair, sheer curtains, sunlit wooden floor and large walnut tabletop clear of props at the bottom. Refined illustrated cinema scene, confident painted contours, warm honey oak, muted sage foliage, dappled natural light, tactile brushwork, airy atmospheric shadows and restrained soft highlights. Cozy, adult editorial art. Fixed 16:9 seated perspective. No lettering, logos, added objects or scenery in the alpha window holes. Paint details up to the cutout edge without changing the window silhouette.

### 窗景

> Use case: style-transfer. Redraw this precise 2x2 landscape texture atlas as lush hand-painted 2D animation background art in gouache and cel paint. Four evenly divided equal-size cells meeting exactly at the middle with no border or gutter: top-left golden morning forest garden and flowering hydrangeas, top-right luminous blue sea and a quiet coastal garden, bottom-left blue-green mountain lake with pine shore and wildflowers, bottom-right misty rain garden in cool sage green. Preserve relative composition, horizon heights and perspective; clear atmospheric layers, painterly flora silhouettes, delicately rendered clouds and brushed colors, mature refined natural fantasy. Each landscape fills its quadrant edge to edge. No window frame, no props, no words, no dark border. Match colors from pale parchment and honey to sage and deep blue. Wide 16:9 atlas.

### 物件

> Use case: style-transfer. Redraw this 3-column 2-row precisely aligned cutout asset sheet of six independent tabletop objects in the style of a warm hand-painted 2D animated background in gouache and cel paint. Top row navy tarot deck with golden sun motif, sage leather book with botanical embossing, open cream notebook with brown cover. Bottom row glass orb on brass stand, ivory flower-painted teacup and saucer, teal fountain pen on small parchment. Preserve each object's exact position and scale within its cell, gentle 3/4 angle and soft warm light from rear right. Delicate dark painted edges, warm honey and cream, realistic proportions with restrained illustration details. Genuinely transparent alpha around every item, retain only tiny soft contact shadows. No surface, no gradient fill around items, no letters or words. Aspect ratio 3:2.


以用户提供的首张窗边书房图为主要构图参考。后续的海景、山湖、森林、雨天和落地窗参考用于确定景观、光线与木质家具的方向。站内书房图像使用内置 ImageGen 生成，场景运行时全部从本项目加载。

| 资源 | 用途与替换方式 |
| --- | --- |
| `public/studio/room.webp` | 室内层。保留窗洞透明区、约16:9构图和底部桌面。窗洞、椅子和桌面的位置变化时，对照 `src/Studio.tsx` 与 `src/studio.css` 校准交互区域。 |
| `public/studio/views.webp` | 四种窗景的二乘二图集。左上森林花园、右上海边、左下山湖、右下雨天花园。每格等大，无间隙。 |
| `public/studio/objects.webp` | 透明物件图集。上排依次为牌组、书籍、日记本，下排为水晶球、茶杯、笔。每格等大，无边框。 |
| `assets/studio-originals/` | 上述三张资源的原始 PNG。部署使用压缩后的 WebP，保留 PNG 便于后续重新裁切和输出。 |
| `public/studio/audio/` | 钢琴与四种自然录音的 MP3，另含 [录音来源与授权](../public/studio/audio/credits.html)。 |
| `src/studioAudio.ts` | 浏览器 Web Audio 按需加载录音，独立控制钢琴和环境音，并在场景切换时淡入淡出。 |

韦特塔罗牌面继续使用 `public/cards/` 的78张扫描及逐张来源清单。参见 [README 的素材与教学依据](../README.md#素材与教学依据)。

## 生成提示词

### 室内层

> Use-case: photorealistic-natural. Create one very high quality 16:9 landscape photographic INTERIOR LAYER for an interactive first-person private tarot study. The attached photograph is composition and natural material reference, not a UI. Seated eye-level camera behind a walnut desk, desk surface filling bottom 33 percent. Same warm cozy room feeling: left edge partial bookcase with old books, comfortable cream armchair and knitted throw in left middle, small warm shaded lamp, hanging green plant, sheer linen curtains and thin dark wooden mullions around a very large central/right window, some wood floor. Asymmetric lived-in quiet European cottage study, editorial lifestyle photography, natural daylight, realistic rich wood grain. The big window/door opening from approximately x=29% to 90%, y=0% to 70% MUST BE GENUINELY TRANSPARENT ALPHA so a separate outdoor scenery image can be placed BEHIND this layer. Keep curtains, frames, interior furniture and floor opaque. The entire walnut desk along the bottom 33% is clear and EMPTY, no cup, cards, books, crystal, pen or flowers on the desk. NO words, typography, buttons, symbols or interface. Do not depict a fantasy room or 3D game. This is a fixed full-frame room cutout with ONLY the outside opening transparent; do not crop away the room. Preserve a broad natural garden-view opening with believable perspective. Output actual alpha transparency, not a gray/checkerboard painted window.

### 窗景

> Use-case: photorealistic-natural. A seamless-edged 2 by 2 CONTACT SHEET texture atlas of FOUR different outdoor views, each fills EXACTLY one equal quadrant with absolutely no gutters, borders, text or labels. Every quadrant is a horizontal lifestyle photograph seen from seated eye height, with natural foreground planting, open midground and distant landscape, no room, no window frame, no desk. TOP LEFT: sunlit green cottage garden with hydrangeas, a tree to one side, open distant forest hills, quiet morning. TOP RIGHT: beautiful open sea with green coastal garden foreground, very distant blue sea horizon, soft sunlight, no beach crowds. BOTTOM LEFT: clear peaceful mountain lake, foreground plants, pine-covered distant mountains, broad open water. BOTTOM RIGHT: same cozy natural garden mood in gentle rain with green trees, wet plants, muted distant forest hills, cool overcast light, no lightning. The horizon is around mid-height inside EACH quadrant, consistent seated photography focal length, natural realism, warm subtle editorial colors, no stylization, no UI. One 16:9 landscape sheet; the four equal quadrant photographs will be selected independently using CSS background-position.

### 桌面物件

> Use-case: photorealistic-natural, product cutout asset sheet. One landscape 3:2 image with a precise 3 columns by 2 rows grid of SIX separate isolated photographic objects on a genuinely TRANSPARENT background. Absolutely no grid lines, separators, words or labels. Each object centered inside its equal-sized cell, generous empty transparent padding around it, no overlap between cells. All viewed from the same seated first-person angle gently looking down at a desk, warm natural window light from back right, realistic wood/paper/brass textures, subtle contact shadows. TOP LEFT: small stacked vintage tarot deck, deep indigo reverse with restrained antique sun motif and cream page edges, rotated a little. TOP MIDDLE: thick CLOSED antique olive green clothbound learning book, embossed small brass botanical ornament, no text. TOP RIGHT: OPEN ivory notebook with soft cream blank pages, brown leather cover, ribbon, unbranded, no readable handwriting. BOTTOM LEFT: small CLEAR transparent glass sphere on a restrained brass circular base, natural reflections, not glowing, not magical. BOTTOM MIDDLE: ivory floral ceramic teacup with saucer containing amber tea, slight steam, elegant modest cottage ceramic. BOTTOM RIGHT: one dark green and brass fountain pen beside a small cream practice card. No other props. Photo real editorial quality, not a drawn icon, not game assets, actual alpha outside each object.

## 插画版素材

这组三张新素材由内置 ImageGen 生成。原始 PNG 来自 ImageGen 生成记录。发布文件由 Chrome 的 Canvas 以质量参数 0.86 编码为 WebP，保留原始尺寸和每个像素的透明度。

| 发布文件 | 原始 PNG | 尺寸 | WebP 大小 |
| --- | --- | --- | ---: |
| `public/studio/room-illustrated.webp` | `ImageGen 原始 PNG` | 1672 × 941 | 376,038 字节 |
| `public/studio/views-illustrated.webp` | `ImageGen 原始 PNG` | 1672 × 941 | 517,374 字节 |
| `public/studio/objects-illustrated.webp` | `ImageGen 原始 PNG` | 1536 × 1024 | 352,576 字节 |

室内层的中央、上侧和右侧窗洞采样点完全透明，桌面采样点的透明通道值为 252（满值 255）。窗景图集全图不透明。物件图集的中心和四边采样点完全透明，并保留了物件轮廓的半透明像素。
