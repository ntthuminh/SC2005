import os
root=os.path.dirname(os.path.abspath(__file__))
src=os.path.join(root,'src')
parts=['algo.js','core.js','ch1.js','ch2.js','ch3.js','ch4.js','ch5.js','ch6.js','ch8.js','ch9.js','ch10.js','ch11.js','ch12.js','main.js']
js='\n'.join(open(os.path.join(src,p)).read() for p in parts)
js=js.replace("if (typeof module !== 'undefined') module.exports","if (false) module.exports")
html=open(os.path.join(src,'head.html')).read()+js+'\n</script>\n</body>\n</html>\n'
os.makedirs(os.path.join(root,'public'),exist_ok=True)
open(os.path.join(root,'public','index.html'),'w').write(html)
print(len(html))
