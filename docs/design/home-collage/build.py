import base64,re,mimetypes
R='/home/user/Mass-Grass/'
def uri(p):
    ext=p.rsplit('.',1)[1]; mt={'webp':'image/webp','jpg':'image/jpeg','svg':'image/svg+xml','woff2':'font/woff2','png':'image/png'}[ext]
    return f'data:{mt};base64,'+base64.b64encode(open(p,'rb').read()).decode()
A={k:f'a/{k}.webp' for k in ['p-boat','hoodie','calendar','p-apr','p-may','p-jaffa','p-gaza','tools','farah','tape0','tape1','tape2']}
A.update({'paper':'a/paper.jpg','logo':R+'assets/brand/logo.svg','may':R+'assets/products/calendar/may.webp',
  'notebook':R+'assets/products/stickers/objects/notebook.webp'})
for s in ['olive','lemon','sunbird','anemone','key']: A[s]=R+f'assets/products/stickers/{s}.webp'
def days(first=4,n=30):
    h=''.join('<i></i>' for _ in range(first))
    for d in range(1,n+1): h+=f'<i{" class=f" if (first+d-1)%7==5 else ""}>{d}</i>'
    return h
def build(src,out):
    s=open(src).read()
    fc=open('fonts-local.css').read()
    fc=re.sub(r'FONT:(f\d+\.woff2)',lambda m:uri(m.group(1)),fc)
    s=s.replace('/*FONTS*/',fc)
    s=re.sub(r'<link href="https://fonts.googleapis[^>]+>','',s)
    s=s.replace('{{days}}',days())
    for k,p in A.items(): s=s.replace('{{'+k+'}}',uri(p))
    assert '{{' not in s, re.findall(r'\{\{[^}]+\}\}',s)
    open(out,'w').write(s); print(out,len(s)//1024,'KB')
if __name__=='__main__': build('comp.src.html','comp.html')
