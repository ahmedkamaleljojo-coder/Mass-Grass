import re,build
R='/home/user/Mass-Grass/'
A=dict(build.A)
for k in ['olive','swallow','tote','hoodie-navy','oranges','print-boat','print-quds','stamp-jaffa','stamp-nablus','stamp-gaza','p-boatsm']: A[k]=f'a/{k}.webp'
A['st-window']=R+'assets/products/stickers/window.webp'; A['st-lemon']=R+'assets/products/stickers/lemon.webp'
T={'ar':dict(lang='ar',dir='rtl',other='EN',t_paint='اللوحات',t_paint2='مطبوعات فنية',t_stk='الملصقات',t_tote='الحقائب',t_hood='الملابس',t_cal='التقويم السنوي',
   t_cards='البطاقات البريدية',t_month='نيسان',t_ftitle='حكاية فرح',t_ftext='بدأت فرح ترسم في الرابعة عشرة، ورافقها دفتر الرسم في كل نزوح. اليوم تبني Mass & Grass من غزة.',t_fcta='قراءة الحكاية',
   nav=['اللوحات','الملصقات','التقويم السنوي','الملابس والحقائب','البطاقات البريدية','تصاميم متنوعة']),
   'en':dict(lang='en',dir='ltr',other='ع',t_paint='Paintings',t_paint2='Art prints',t_stk='Stickers',t_tote='Bags',t_hood='Clothing',t_cal='2027 Calendar',
   t_cards='Postcards',t_month='April',t_ftitle="Farah's story",t_ftext='Farah began painting at fourteen, and her sketchbook came with her through every displacement. Today she builds Mass & Grass from Gaza.',t_fcta='Read the story',
   nav=['Paintings','Stickers','Calendar','Clothes & bags','Postcards','More designs'])}
for lg,t in T.items():
    s=open('comp2.src.html').read()
    fc=re.sub(r'FONT:([\w]+\.woff2)',lambda m:build.uri(m.group(1)),open('fonts2-local.css').read())
    s=s.replace('/*FONTS*/',fc).replace('{{days}}',build.days()).replace('{{nav}}',''.join(f'<a>{x}</a>' for x in t.pop('nav')))
    for k,v in t.items(): s=s.replace('{{'+k+'}}',v)
    for k,p in A.items():
        if '{{'+k+'}}' in s: s=s.replace('{{'+k+'}}',build.uri(p))
    left=re.findall(r'\{\{[^}]+\}\}',s); assert not left,left
    open(f'home-{lg}.html','w').write(s); print(lg,len(s)//1024)
