import sympy as sp
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application, convert_xor

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DataIntegral(BaseModel):
    batas_bawah: str
    batas_atas: str
    fungsi: str

class DataRegresi(BaseModel):
    xData: list[float]
    yData: list[float]
    orde: int

# ==========================================
# ENDPOINT 1: TAB EVALUASI DASAR
# ==========================================
@app.post("/api/hitung")
async def hitung_integral(data: DataIntegral):
    try:
        transformations = standard_transformations + (implicit_multiplication_application, convert_xor)
        expr = parse_expr(data.fungsi, transformations=transformations)
        
        variabel_list = list(expr.free_symbols)
        if len(variabel_list) > 1:
            contoh_var = str(variabel_list[0])
            return {"status": "error", "message": f"\nPersamaan Memiliki Lebih Dari 1 Variabel, \nIni: {variabel_list}. \nGanti Jadi Satu Variabel!.\nContoh: [{contoh_var}]"}

        var = variabel_list[0] if variabel_list else sp.Symbol('x')
        var_name = str(var)
        kapital = var_name.upper()

        antiturunan = sp.integrate(expr, var)
        batas_atas_val = sp.sympify(data.batas_atas)
        batas_bawah_val = sp.sympify(data.batas_bawah)
        
        simbol_atas = sp.Symbol(f"({batas_atas_val})")
        simbol_bawah = sp.Symbol(f"({batas_bawah_val})")
        
        step_atas_raw = antiturunan.subs(var, simbol_atas)
        step_bawah_raw = antiturunan.subs(var, simbol_bawah)
        
        hasil_atas = antiturunan.subs(var, batas_atas_val)
        hasil_bawah = antiturunan.subs(var, batas_bawah_val)
        hasil_akhir = hasil_atas - hasil_bawah

        bracket_latex = f"\\left[ {sp.latex(antiturunan)} \\right]_{{{sp.latex(batas_bawah_val)}}}^{{{sp.latex(batas_atas_val)}}}"

        return {
            "status": "success", "variabel": var_name, "huruf_kapital": kapital, "fungsi_latex": sp.latex(expr),
            "antiturunan_latex": sp.latex(antiturunan), "bracket_latex": bracket_latex,
            "batas_atas": sp.latex(batas_atas_val), "batas_bawah": sp.latex(batas_bawah_val),
            "step_atas_raw": sp.latex(step_atas_raw), "step_bawah_raw": sp.latex(step_bawah_raw),
            "hasil_atas": sp.latex(hasil_atas), "hasil_bawah": sp.latex(hasil_bawah),
            "hasil_akhir": sp.latex(hasil_akhir), "hasil_desimal": float(hasil_akhir.evalf())
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ==========================================
# ENDPOINT 2: TAB PERMODELAN DATA
# ==========================================
@app.post("/api/regresi")
async def hitung_regresi(data: DataRegresi):
    try:
        x_arr = np.array(data.xData)
        y_arr = np.array(data.yData)
        
        if len(x_arr) < 2 or len(x_arr) != len(y_arr):
            return {"status": "error", "message": "Data tidak valid bro! Minimal ada 2 titik."}
        
        coeffs = np.polyfit(x_arr, y_arr, data.orde)
        terms = []
        degree = data.orde
        for i, coef in enumerate(coeffs):
            coef_rounded = round(coef, 4)
            if coef_rounded == int(coef_rounded): coef_rounded = int(coef_rounded)
            current_deg = degree - i
            if current_deg == 0: terms.append(f"{coef_rounded}")
            elif current_deg == 1: terms.append(f"{coef_rounded}*t")
            else: terms.append(f"{coef_rounded}*t**{current_deg}")
                
        fungsi_str = " + ".join(terms)
        transformations = standard_transformations + (implicit_multiplication_application, convert_xor)
        expr = parse_expr(fungsi_str, transformations=transformations)
        var = sp.Symbol('t')
        var_name = "t"
        
        antiturunan = sp.integrate(expr, var)
        min_x = round(float(min(x_arr)), 4)
        max_x = round(float(max(x_arr)), 4)
        if min_x == int(min_x): min_x = int(min_x)
        if max_x == int(max_x): max_x = int(max_x)
        
        batas_bawah_val = sp.sympify(str(min_x))
        batas_atas_val = sp.sympify(str(max_x))
        
        simbol_atas = sp.Symbol(f"({batas_atas_val})")
        simbol_bawah = sp.Symbol(f"({batas_bawah_val})")
        
        step_atas_raw = antiturunan.subs(var, simbol_atas)
        step_bawah_raw = antiturunan.subs(var, simbol_bawah)
        hasil_atas = antiturunan.subs(var, batas_atas_val)
        hasil_bawah = antiturunan.subs(var, batas_bawah_val)
        hasil_akhir = hasil_atas - hasil_bawah
        
        bracket_latex = f"\\left[ {sp.latex(antiturunan)} \\right]_{{{sp.latex(batas_bawah_val)}}}^{{{sp.latex(batas_atas_val)}}}"
        x_line = np.linspace(min(x_arr), max(x_arr), 50)
        y_line = np.polyval(coeffs, x_line)
        chart_data = [{"x": round(float(x), 4), "y": round(float(y), 4)} for x, y in zip(x_line, y_line)]

        return {
            "status": "success", "variabel": var_name, "fungsi_latex": sp.latex(expr),
            "antiturunan_latex": sp.latex(antiturunan), "bracket_latex": bracket_latex,
            "batas_atas": sp.latex(batas_atas_val), "batas_bawah": sp.latex(batas_bawah_val),
            "step_atas_raw": sp.latex(step_atas_raw), "step_bawah_raw": sp.latex(step_bawah_raw),
            "hasil_atas": sp.latex(hasil_atas), "hasil_bawah": sp.latex(hasil_bawah),
            "hasil_akhir": sp.latex(hasil_akhir), "hasil_desimal": float(hasil_akhir.evalf()), "chart_data": chart_data
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ==========================================
# ENDPOINT 3: TAB KOMPARASI (NUMERIK VS ANALITIK)
# ==========================================
@app.post("/api/komparasi")
async def hitung_komparasi(data: DataRegresi):
    try:
        x_arr = np.array(data.xData)
        y_arr = np.array(data.yData)
        
        if len(x_arr) < 2 or len(x_arr) != len(y_arr):
            return {"status": "error", "message": "Data tidak valid bro! Minimal 2 titik."}

        # 1. METODE NUMERIK (Aturan Trapesium)
        # Rumus: Area = sum( 0.5 * (x_i - x_{i-1}) * (y_i + y_{i-1}) )
        luas_numerik = 0.0
        step_numerik_terms = []
        for i in range(1, len(x_arr)):
            dx = x_arr[i] - x_arr[i-1]
            avg_y = (y_arr[i] + y_arr[i-1]) / 2.0
            luas_numerik += dx * avg_y
            
            # Format raw step: \frac{x1 - x0}{2}(y0 + y1)
            step_numerik_terms.append(f"\\frac{{{x_arr[i]} - {x_arr[i-1]}}}{{2}}({y_arr[i-1]} + {y_arr[i]})")
        
        # Gabungkan beberapa term pertama untuk display (biar gak kepanjangan kalau data ratusan)
        if len(step_numerik_terms) > 3:
            latex_numerik_raw = " + ".join(step_numerik_terms[:2]) + " + \\dots + " + step_numerik_terms[-1]
        else:
            latex_numerik_raw = " + ".join(step_numerik_terms)

        luas_numerik = round(luas_numerik, 4)

        # 2. METODE ANALITIK (Integral Regresi - Persis seperti Tab 2)
        coeffs = np.polyfit(x_arr, y_arr, data.orde)
        terms = []
        degree = data.orde
        for i, coef in enumerate(coeffs):
            coef_rounded = round(coef, 4)
            if coef_rounded == int(coef_rounded): coef_rounded = int(coef_rounded)
            current_deg = degree - i
            if current_deg == 0: terms.append(f"{coef_rounded}")
            elif current_deg == 1: terms.append(f"{coef_rounded}*t")
            else: terms.append(f"{coef_rounded}*t**{current_deg}")
                
        fungsi_str = " + ".join(terms)
        transformations = standard_transformations + (implicit_multiplication_application, convert_xor)
        expr = parse_expr(fungsi_str, transformations=transformations)
        var = sp.Symbol('t')
        
        antiturunan = sp.integrate(expr, var)
        batas_bawah_val = sp.sympify(str(round(float(min(x_arr)), 4)))
        batas_atas_val = sp.sympify(str(round(float(max(x_arr)), 4)))
        
        hasil_atas = antiturunan.subs(var, batas_atas_val)
        hasil_bawah = antiturunan.subs(var, batas_bawah_val)
        luas_analitik = float((hasil_atas - hasil_bawah).evalf())
        luas_analitik = round(luas_analitik, 4)

        # 3. KALKULASI SELISIH (Error Rate)
        selisih = round(abs(luas_analitik - luas_numerik), 4)

        return {
            "status": "success",
            "numerik_luas": luas_numerik,
            "numerik_raw_latex": latex_numerik_raw,
            "analitik_luas": luas_analitik,
            "analitik_fungsi_latex": sp.latex(expr),
            "selisih_error": selisih
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}