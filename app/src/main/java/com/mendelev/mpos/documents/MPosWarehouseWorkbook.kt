package com.mendelev.mpos.documents

import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

/** Source WarehouseWorkbook OOXML layout, independent sheets and editable numeric cells. */
internal object MPosWarehouseWorkbook {
    private const val NS="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
    private const val REL="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    private const val PACKAGE="http://schemas.openxmlformats.org/package/2006/relationships"
    fun xml(value:String)=value.filter{it=='\t'||it=='\n'||it=='\r'||it.code>=32&&it!='\uFFFE'&&it!='\uFFFF'}.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;")
    private fun col(index:Int):String {var n=index+1;var result="";while(n>0){n--;result=('A'.code+n%26).toChar()+result;n/=26};return result}
    fun files(report:JSONObject):Map<String,String> {
        val files=linkedMapOf<String,String>();val sections=MPosDocumentCanvas.objects(report.optJSONArray("sections")).toMutableList()
        sections+=JSONObject().put("title","Пояснения").put("headers",JSONArray().put("Как читать отчёт")).put("excelRows",JSONArray().apply{for(note in MPosDocumentCanvas.strings(report.optJSONArray("notes")))put(JSONArray().put(note))})
        val heading=report.optString("company").trim().ifBlank{"Название заведения не указано"}
        val sheets=StringBuilder();val links=StringBuilder();val overrides=StringBuilder()
        for((index,section) in sections.withIndex()) {
            val id=index+1;val name=section.optString("title","Раздел $id").take(31)
            sheets.append("<sheet name=\"${xml(name)}\" sheetId=\"$id\" r:id=\"rId$id\"/>")
            links.append("<Relationship Id=\"rId$id\" Type=\"$REL/worksheet\" Target=\"worksheets/sheet$id.xml\"/>")
            overrides.append("<Override PartName=\"/xl/worksheets/sheet$id.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>")
            val headers=section.optJSONArray("excelHeaders") ?: section.optJSONArray("headers") ?: JSONArray()
            val rows=section.optJSONArray("excelRows") ?: section.optJSONArray("rows") ?: JSONArray()
            fun row(values:JSONArray,number:Int,style:Int):String {
                val cells=buildString{for(i in 0 until values.length()){
                    val value=values.opt(i);val reference=col(i)+number
                    val numeric=if(value is Number && value.toDouble().isFinite())value.toString() else if(value is Boolean)if(value)"1" else "0" else null
                    if(numeric!=null)append("<c r=\"$reference\" s=\"${if(style==3)4 else 2}\"><v>$numeric</v></c>")
                    else append("<c r=\"$reference\" s=\"$style\" t=\"inlineStr\"><is><t xml:space=\"preserve\">${xml(if(value==null||value==JSONObject.NULL)"—" else value.toString())}</t></is></c>")
                }}
                val longest=(0 until values.length()).maxOfOrNull{values.opt(it).toString().codePointCount(0,values.opt(it).toString().length)} ?: 0
                val h=minOf(300,maxOf(if(style==1)38 else 34,(longest/35+1)*16))
                return "<row r=\"$number\" ht=\"$h\" customHeight=\"1\">$cells</row>"
            }
            val body=buildString{append(row(JSONArray().put(heading),1,0));append(row(JSONArray().put(name+" · "+report.optString("period")),2,0));append(row(JSONArray().put("Сформировано: "+report.optString("generatedAt")),3,0));append(row(headers,5,1));for(i in 0 until rows.length())append(row(rows.optJSONArray(i)?:JSONArray(),i+6,if(i%2==0)3 else 0))}
            val end=col(maxOf(0,headers.length()-1));val columns=(0 until headers.length()).joinToString(""){i->"<col min=\"${i+1}\" max=\"${i+1}\" width=\"${if(headers.length()==1)115 else if(i==0)42 else 23}\" customWidth=\"1\"/>"}
            val merges=if(headers.length()>1)"<mergeCells count=\"3\"><mergeCell ref=\"A1:${end}1\"/><mergeCell ref=\"A2:${end}2\"/><mergeCell ref=\"A3:${end}3\"/></mergeCells>" else ""
            val filter=if(rows.length()==0)"" else "<autoFilter ref=\"A5:$end${rows.length()+5}\"/>"
            overrides.append("<Override PartName=\"/xl/drawings/drawing$id.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.drawing+xml\"/>")
            val banner=listOf(heading,name+" · "+report.optString("period"),"Сформировано: "+report.optString("generatedAt")).mapIndexed{i,text->"<a:p><a:r><a:rPr lang=\"ru-RU\" sz=\"${if(i==0)1800 else 1100}\" b=\"${if(i==0)1 else 0}\"><a:solidFill><a:srgbClr val=\"FFFFFF\"/></a:solidFill></a:rPr><a:t>${xml(text)}</a:t></a:r></a:p>"}.joinToString("")
            fun anchor(top:Int,bottom:Int,offset:Int,shape:String)= "<xdr:twoCellAnchor editAs=\"twoCell\"><xdr:from><xdr:col>0</xdr:col><xdr:colOff>$offset</xdr:colOff><xdr:row>$top</xdr:row><xdr:rowOff>$offset</xdr:rowOff></xdr:from><xdr:to><xdr:col>${headers.length()}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>$bottom</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>$shape<xdr:clientData/></xdr:twoCellAnchor>"
            val bannerShape="""<xdr:sp><xdr:nvSpPr><xdr:cNvPr id="1" name="Название заведения"/><xdr:cNvSpPr/></xdr:nvSpPr><xdr:spPr><a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 12000"/></a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:ln><a:noFill/></a:ln></xdr:spPr><xdr:txBody><a:bodyPr wrap="square" lIns="190500" tIns="95000" rIns="190500" bIns="95000" anchor="ctr"><a:normAutofit/></a:bodyPr><a:lstStyle/>$banner</xdr:txBody></xdr:sp>"""
            val outline="""<xdr:sp><xdr:nvSpPr><xdr:cNvPr id="2" name="Контур раздела"/><xdr:cNvSpPr/></xdr:nvSpPr><xdr:spPr><a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 1500"/></a:avLst></a:prstGeom><a:noFill/><a:ln w="12700"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln></xdr:spPr></xdr:sp>"""
            files["xl/drawings/drawing$id.xml"]="<xdr:wsDr xmlns:xdr=\"http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing\" xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\">${anchor(0,3,19050,bannerShape)}${anchor(4,rows.length()+5,0,outline)}</xdr:wsDr>"
            files["xl/worksheets/_rels/sheet$id.xml.rels"]="<Relationships xmlns=\"$PACKAGE\"><Relationship Id=\"banner\" Type=\"$REL/drawing\" Target=\"../drawings/drawing$id.xml\"/></Relationships>"
            files["xl/worksheets/sheet$id.xml"]="<?xml version=\"1.0\" encoding=\"UTF-8\"?><worksheet xmlns=\"$NS\" xmlns:r=\"$REL\"><sheetViews><sheetView showGridLines=\"0\" workbookViewId=\"0\"><pane ySplit=\"5\" topLeftCell=\"A6\" activePane=\"bottomLeft\" state=\"frozen\"/></sheetView></sheetViews><cols>$columns</cols><sheetData>$body</sheetData>$filter$merges<drawing r:id=\"banner\"/></worksheet>"
        }
        files["xl/workbook.xml"]="<workbook xmlns=\"$NS\" xmlns:r=\"$REL\"><sheets>$sheets</sheets></workbook>"
        files["xl/_rels/workbook.xml.rels"]="<Relationships xmlns=\"$PACKAGE\">$links<Relationship Id=\"styles\" Type=\"$REL/styles\" Target=\"styles.xml\"/></Relationships>"
        files["_rels/.rels"]="<Relationships xmlns=\"$PACKAGE\"><Relationship Id=\"office\" Type=\"$REL/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>"
        files["[Content_Types].xml"]="<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/><Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/>$overrides</Types>"
        files["xl/styles.xml"]=STYLES
        return files
    }
    fun write(report:JSONObject,file:File){ZipOutputStream(file.outputStream()).use{zip->for((name,value)in files(report)){zip.putNextEntry(ZipEntry(name));zip.write(value.toByteArray(Charsets.UTF_8));zip.closeEntry()}}}
    private val STYLES="""<styleSheet xmlns="$NS"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.######"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="12"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF000000"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF5F5F5"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1" indent="1"/></xf><xf numFmtId="164" fontId="0" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>"""
}
