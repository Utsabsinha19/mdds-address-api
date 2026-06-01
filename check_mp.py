import pandas as pd

file = r"datasets/Rdir_2011_23_MADHYA_PRADESH.xls"

xls = pd.ExcelFile(file)

print("Sheets:")
print(xls.sheet_names)

for sheet in xls.sheet_names:
    print(f"\n===== SHEET: {sheet} =====")

    try:
        df = pd.read_excel(
            file,
            sheet_name=sheet,
            header=None,
            nrows=20
        )

        print(df)
    except Exception as e:
        print(e)