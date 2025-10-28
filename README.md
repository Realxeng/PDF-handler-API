# JSONtoPDF
A javascript API that takes in json input and create a pdf table output.  

The API supports JSON with nested arrays and objects. 
By default, the server route the function through `/jsontopdf` route and expects POST HTTP method from the request. Otherwise, the API will return 404 Not Found.  

The API expects the JSON data to be passed in the request body and the [options](https://github.com/Realxeng/JSONtoPDF?tab=readme-ov-file#query-options) passed in the request query.

The API uses [pdfkit](https://www.npmjs.com/package/pdfkit) package. For more information visit [PDFKit Documentation](https://pdfkit.org/docs/getting_started.html)
## Query Options
- `title (string)`  
Title of the PDF shown in the middle top of the first page
- `description (string)`  
Small text shown under the title on top of the table
- `remarks (string)`  
Small text shown under the table
- `size (string || array)`  
The ISO paper size of the PDF or array containing [width, height] of the paper (defaults to A4). [Paper Sizes](https://pdfkit.org/docs/paper_sizes.html)
- `margin (number || string)`  
The margin to be used on the paper in PDF pts, or in other units with string (defaults to 50pt) [Pages Properties](https://pdfkit.org/docs/getting_started.html#adding_pages)
- `margins ({top: number, bottom: number, left: number, right: number})`  
The margins for each specific paper sides 
- `layout (string)`  
The layout of the PDF. either "potrait" or "landscape"
- `font (string)`  
The default font to be used in the PDF [Availabe Fonts](https://pdfkit.org/docs/text.html#fonts)
