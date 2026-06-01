# scripts/import_maharashtra.py

import pandas as pd

file_path = r"datasets/Rdir_2011_27_MAHARASHTRA.xls"

df = pd.read_excel(file_path)

print(df.head())
print()
print("Rows:", len(df))
print("Columns:", list(df.columns))