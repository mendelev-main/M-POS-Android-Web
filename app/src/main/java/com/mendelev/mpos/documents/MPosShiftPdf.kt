package com.mendelev.mpos.documents

import android.graphics.Color
import android.text.Layout
import org.json.JSONObject
import java.io.File
import java.util.Locale

/** Portrait cash shift report from the original iPad print bridge. */
internal object MPosShiftPdf {
    fun write(report:JSONObject,file:File,surface:MPosDocumentPages=MPosPdfPages(595,842))=surface.use{pages->
        val d=MPosDocumentCanvas;val ink=Color.rgb(18,23,33);val muted=Color.rgb(97,107,122);val light=Color.rgb(242,245,250)
        var y=0f
        fun text(s:String,x:Float,top:Float,w:Float,size:Float=9f,bold:Boolean=false,color:Int=ink,right:Boolean=false,weight:Int=if(bold)700 else 400)=d.text(pages.canvas,s,x,top,w,size,weight,color,if(right)Layout.Alignment.ALIGN_OPPOSITE else Layout.Alignment.ALIGN_NORMAL)
        fun date(key:String)=report.optLong(key).takeIf{it>0}?.let(d::date)?:"—"
        fun money(key:String)=String.format(Locale.US,"%.2f %s",d.number(report,key),report.optString("currency","Br"))
        val establishment=report.optString("establishmentName").trim().ifBlank{"ПРИЛАВОК"}
        fun footer(){text("Стр. ${pages.number}",36f,814f,523f,9f,false,muted,true)}
        fun next(){
            pages.next();val continuation=pages.number>1
            d.round(pages.canvas,36f,36f,523f,if(continuation)56f else 92f,18f,ink)
            text(establishment,56f,53f,483f,if(continuation)15f else 17f,true,Color.WHITE)
            text(if(continuation)"ОТЧЁТ ПО СМЕНЕ · ПРОДОЛЖЕНИЕ" else "ОТЧЁТ ПО КАССОВОЙ СМЕНЕ",56f,if(continuation)72f else 84f,483f,9f,false,Color.rgb(209,209,209),weight=500)
            if(!continuation){text("№ "+report.optString("id"),350f,58f,189f,9f,false,Color.rgb(209,209,209),true);text(date("openedAt"),350f,74f,189f,9f,false,Color.rgb(209,209,209),true)}
            y=if(continuation)108f else 146f
        }
        next();d.round(pages.canvas,36f,y,523f,86f,14f,light)
        text("СОТРУДНИК",52f,y+14f,260f,9f,false,muted)
        text(report.optString("employeeName","Сотрудник не указан"),52f,y+31f,260f,12f,true)
        text(report.optString("employeePhone"),52f,y+49f,260f,9f,false,muted)
        text("Открытие: "+date("openedAt"),322f,y+14f,221f,9f,false,muted,true)
        text("Закрытие: "+date("closedAt"),322f,y+32f,221f,9f,false,muted,true);y+=102f
        val stats=listOf("ЗАКАЗОВ" to (report.optJSONArray("orders")?.length()?:0).toString(),"ВЫРУЧКА" to money("total"),"НАЛИЧНЫЕ" to money("cash"),"КАРТА" to money("card"),"НАЛИЧНЫЕ НА НАЧАЛО СМЕНЫ" to money("openingCash"),"ВНЕСЕНО" to money("deposits"),"ИЗЪЯТО" to money("withdrawals"),"ОЖИДАЕТСЯ" to money("expectedCash"),"ФАКТ" to money("countedCash"),"РАСХОЖДЕНИЕ" to money("difference"))
        stats.forEachIndexed{i,(label,value)->val x=36f+(i%2)*270.5f;val top=y+(i/2)*58f;d.round(pages.canvas,x,top,252.5f,48f,10f,Color.rgb(247,247,250));text(label,x+10f,top+8f,228.5f,7.5f,false,muted,weight=500);text(value,x+10f,top+23f,228.5f,11f,true)};y+=308f
        val movements=d.objects(report.optJSONArray("cashMovements"))
        if(movements.isNotEmpty()){
            text("ДВИЖЕНИЕ НАЛИЧНЫХ",36f,y,523f,12f,true);y+=24f
            d.round(pages.canvas,36f,y,523f,26f,8f,ink);text("ВРЕМЯ / ОПЕРАЦИЯ",46f,y+7f,360f,9f,false,Color.WHITE);text("СУММА",424f,y+7f,125f,9f,false,Color.WHITE,true);y+=34f
            movements.forEach{movement->
                val deposit=movement.optString("type")=="deposit"
                val label=d.date(movement.optLong("timestamp"))+" · "+if(deposit)"Внесение наличных" else "Изъятие наличных"
                val note=movement.optString("note").takeIf{it.isNotBlank()}?.let{" · $it"}.orEmpty()
                val h=maxOf(28f,d.layout(label+note,360f,9f).height+14f)
                if(y+h>800f){footer();next()}
                d.round(pages.canvas,36f,y,523f,h,5f,Color.WHITE);text(label+note,46f,y+7f,360f)
                text((if(deposit)"+" else "−")+String.format(Locale.US,"%.2f %s",d.number(movement,"amount"),report.optString("currency","Br")),424f,y+7f,125f,9f,false,right=true);y+=h+2f
            }
        }
        footer();pages.save(file)
    }
}
