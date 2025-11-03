const PDF = require("pdfkit");
const joi = require("joi");
const depth = require("object-depth");
const { flatten } = require("flat");
const util = require("util");
const { table } = require("console");

//Create the query schema
const schema = joi
  .object({
    filename: joi.string(),
    title: joi.string(),
    description: joi.string(),
    remarks: joi.string(),
    compress: joi.bool(),
    userPassword: joi.string(),
    ownerPassword: joi.string(),
    pdfVersion: joi.string(),
    autoFirstPage: joi.bool(),
    size: joi
      .alternatives()
      .try(
        joi
          .string()
          .valid(
            "4A0",
            "2A0",
            "A0",
            "A1",
            "A2",
            "A3",
            "A4",
            "A5",
            "A6",
            "A7",
            "A8",
            "A9",
            "A10",
            "B0",
            "B1",
            "B2",
            "B3",
            "B4",
            "B5",
            "B6",
            "B7",
            "B8",
            "B9",
            "B10",
            "C0",
            "C1",
            "C2",
            "C3",
            "C4",
            "C5",
            "C6",
            "C7",
            "C8",
            "C9",
            "C10",
            "RA0",
            "RA1",
            "RA2",
            "RA3",
            "RA4",
            "SRA0",
            "SRA1",
            "SRA2",
            "SRA3",
            "SRA4",
            "LETTER",
            "LEGAL",
            "TABLOID",
            "EXECUTIVE",
            "FOLIO"
          ),
        joi.array().items(joi.number()).min(2).max(2)
      )
      .default("A4"),
    margin: joi.alternatives().try(joi.number(), joi.string()).default(50),
    margins: joi.object({
      top: joi.number().min(0),
      bottom: joi.number().min(0),
      left: joi.number(),
      right: joi.number(),
    }),
    layout: joi.string().valid("potrait", "landscape"),
    font: joi
      .string()
      .valid(
        "Courier",
        "Courier-Bold",
        "Courier-Oblique",
        "Courier-BoldOblique",
        "Helvetica",
        "Helvetica-Bold",
        "Helvetica-Oblique",
        "Helvetica-BoldOblique",
        "Symbol",
        "Times-Roman",
        "Times-Bold",
        "Times-Italic",
        "Times-BoldItalic",
        "ZapfDingbats"
      )
      .default("Times-Roman"),
    logo: joi.string().uri(),
    attachments: joi
      .array()
      .items(
        joi.object({
          name: joi.string().required(),
          uri: joi.string().uri().required(),
        })
      )
      .optional(),
  })
  .unknown(false);

async function convert(req, res) {
  const body = req.body;
  //Validate the request query
  const { error, value: queryValue } = schema.validate(body.options || {}, {
    abortEarly: false,
  });
  //Check query validation
  if (error) return res.status(400).json(error);
  //Get the data and query
  const data = body.data;
  let logo = queryValue.logo || false;
  if (logo) {
    try {
      const response = await fetch(logo);
      const logoBuffer = await response.arrayBuffer();
      logo = Buffer.from(logoBuffer);
    } catch (error) {
      console.log(error);
      logo = false;
    }
  }

  //Build header
  const drawHeader = (doc) => {
    const pageWidth = doc.page.width;
    const margin = doc.page.margins.left;
    const logoWidth = 80;
    const logoX = pageWidth - margin - logoWidth;
    const logoY = 0;
    doc.image(logo, logoX, logoY, { width: logoWidth });
  };

  //Set the default font
  const FONT = queryValue.font;
  //Check the data
  if (!data || typeof data !== "object") {
    console.log("Request body: ");
    console.log(req.body);
    return res.status(400).json({ message: "No JSON to parse" });
  }
  //Find the max depth
  const maxDepth = depth(data) + 1;
  if (!maxDepth || maxDepth < 1) {
    console.log("Data: ");
    console.log(data);
    return res.status(400).json({ message: "Incomplete JSON" });
  }

  const { title, description, remarks, ...pageOptions } = queryValue;

  //Intialize the PDF
  const doc = new PDF({
    ...pageOptions,
    info: {
      Title: queryValue.title || "Form",
    },
  });
  const pageHeight =
    doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
  const pageWidth = doc.page.width;
  const marginLeft = doc.page.margins.left;
  const marginRight = doc.page.margins.right;

  //Create filename
  const filename = (queryValue.filename || queryValue.title || "form")
    .replace(/[^\w\d_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  //Set the response header
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename=${filename}.pdf`);
  res.status(200);
  //Send the pdf to res object
  doc.pipe(res);

  /**
   * Build the PDF
   */
  //Logo header
  if (logo) drawHeader(doc);

  //Title
  if (queryValue.title) {
    doc.font(FONT).fontSize(24).text(queryValue.title, { align: "center" });
    doc.fontSize(12).text("\n");
  }
  //Description
  if (queryValue.description)
    doc.font(FONT).fontSize(12).text(queryValue.description);

  doc.on("pageAdded", () => {
    if (logo) drawHeader(doc);
  });

  //Build the table data
  let tdArray = [];

    //Function to traverse the data
    const buildTableData = (obj, depth, parent = "") => {
        //Arrays
        if (Array.isArray(obj)) {
            obj.forEach((value, index) => {
                if (typeof value === 'object') {
                    const rowSpan = 1
                    if (!tdArray.length) {
                        tdArray.push([{ rowSpan, align: { x: 'center', y: 'center' }, text: `${parent} ${index + 1}`, border: [true, true, false, true] }])
                    } else if (index === 0) {
                        //tdArray.at(-1).pop()
                        tdArray.at(-1)[tdArray.at(-1).length - 1] = { rowSpan, align: { x: 'center', y: 'center' }, text: `${parent} ${index + 1}`, border: [true, true, false, true] }
                    } else {
                        tdArray.push([{ rowSpan, align: { x: 'center', y: 'center' }, text: `${parent} ${index + 1}`, border: [true, true, false, true] }]);
                    }
                    buildTableData(value, depth);
                }
                //Value
                else {
                    const colSpan = depth
                    if (depth === maxDepth || index > 0) {
                        tdArray.push([{ colSpan, text: value }])
                    } else if (index === 0) {
                        tdArray.at(-1).push({ colSpan, text: value })
                    }
                }
            });
        }
        //Objects
        else {
            Object.entries(obj).forEach(([key, value], index) => {
                if (typeof value === 'object') {
                    const rowSpan = 1
                    !tdArray.length ? tdArray.push([{ rowSpan, text: key, border: [true, true, false, true] }])
                        : index === 0 ? tdArray.at(-1).push({ rowSpan, text: key, border: [true, true, false, true] })
                            : tdArray.push([{ rowSpan, text: key, border: [true, true, false, true] }])
                    buildTableData(value, depth - 1, key)
                }
                //Value
                else {
                    const colSpan = depth - 1
                    if (depth === maxDepth || index > 0) {
                        tdArray.push([{ text: key }])
                    } else if (index === 0) {
                        tdArray.at(-1).push({ text: key })
                    }
                    tdArray.at(-1).push({ colSpan, text: value });
                }
            })
        }
      });
    }
  };

  //Create the table
  console.log("Processing data");
  buildTableData(data, maxDepth);

  //Create table pagination
  const cellWidth = (pageWidth - marginLeft - marginRight) / maxDepth;
  doc.font(FONT).fontSize(12);
  const tablePages = [[]];
  let currentY = doc.y;
  const tdPages = tdArray.length;
  console.log("Paginating table");
  for (const [index, td] of tdArray.entries()) {
    const rowHeight = Math.max(
      ...td.map((cell) => {
        return (
          doc.heightOfString(cell.text, {
            width: cellWidth * (cell.colSpan || 1),
          }) + 10
        );
      })
    );
    const totalColSpan = td.reduce((sum, cell) => {
      return sum + (cell.colSpan || 1);
    }, 0);
    //console.log(`total row colspan: ${totalColSpan}`)
    if (currentY + rowHeight > pageHeight) {
      const currPage = tablePages[tablePages.length - 1];
      const newRow = [];
      newRow.push({
        text: "",
        colSpan: maxDepth,
        border: [true, false, false, false],
      });
      currPage.push(newRow);
      tablePages.push([]);
      currentY = doc.page.margins.top;
    }
    const currPage = tablePages[tablePages.length - 1];
    const newRow = [];
    if (currentY === doc.page.margins.top) {
      for (let i = totalColSpan; i < maxDepth; i++) {
        newRow.push({ text: "", border: [true, true, false, true] });
      }
    } else {
      for (let i = totalColSpan; i < maxDepth; i++) {
        newRow.push({ text: "", border: [false, true, false, true] });
      }
    }
    newRow.push(...td);
    currPage.push(newRow);
    currentY += rowHeight;
    if (index === tdPages - 1)
      currPage.push([
        { text: "", colSpan: maxDepth, border: [true, false, false, false] },
      ]);
  }

  //Print the table
  console.log("Printing table");
  const numPage = tablePages.length;
  for (const [index, pages] of tablePages.entries()) {
    //console.log(util.inspect(pages, { depth: null, colors: true }))
    /*
        console.log("Row widths check:");
        for (const [i, row] of pages.entries()) {
            const totalColSpan = row.reduce((s, c) => s + (c.colSpan || 1), 0);
            console.log(`Row ${i} colspan total: ${totalColSpan}`);
        }
        */
    doc.table({
      data: pages,
      defaultStyle: {
        padding: {
          top: 6,
          bottom: 4,
          left: 4,
          right: 4,
        },
        align: {
          x: "left",
          y: "center",
        },
      },
    });
    if (index < numPage - 1) doc.addPage();
  }
  //doc.addPage()
  doc.text("\n");

  // Attachments
  let image;
  if (queryValue.attachments) {
    for (const [index, value] of queryValue.attachments.entries()) {
        doc.addPage();//start every attachment in a new page
        doc.font(FONT).fontSize(14).text(`Attachment ${index + 1}`);
        doc.font(FONT).fontSize(12).text(`Name: ${value.name}`);
        doc.moveDown(0.5);

      try {
        const response = await fetch(value.uri);
        if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);

        const imageBuffer = await response.arrayBuffer();
        image = Buffer.from(imageBuffer);

        // Draw the image with proper size and spacing
        doc.image(image, {
          fit: [doc.page.width - 100, doc.page.height - 150], // adjust size
          align: "center",
          valign: "center"
        });
        doc.moveDown(1);
      } catch (error) {
        console.error("Attachment error:", error);
        doc
          .font(FONT)
          .fontSize(12)
          .fillColor("red")
          .text("Could not load attachment.");
        doc.moveDown(1);
        doc.fillColor("black"); // reset color
      }
    }
  }

  //Remarks
  if (queryValue.remarks) doc.font(FONT).fontSize(12).text(queryValue.remarks);

    //Close the doc
    doc.end();
}

function countDepthwithArrayIndices(object) {
    const baseDepth = depth(object)

    const numArray = countArrays(object)
    return baseDepth - numArray
}

function countArrays(object) {
    if (Array.isArray(object)) {
        return 1 + object.reduce((sum, item) => sum + countArrays(item), 0)
    } else if (object && typeof o === 'object') {
        return Object.values(object).reduce((sum, item) => sum + countArrays(item), 0)
    } else {
        return 0
    }
}

module.exports = convert;
