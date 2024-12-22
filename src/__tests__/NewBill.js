/**
 * @jest-environment jsdom
 */

import { screen, fireEvent, waitFor } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { ROUTES_PATH } from "../constants/routes";
import mockStore from "../__mocks__/store";

// mock du store utilisé
jest.mock("../app/Store", () => mockStore);

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    beforeEach(() => {
      document.body.innerHTML = NewBillUI();
      window.localStorage.setItem(
        "user",
        JSON.stringify({ email: "employee@test.com" })
      );
    });

    test("Then the new bill form should be displayed", () => {
      expect(screen.getByTestId("form-new-bill")).toBeTruthy();
    });

    test("Then all form fields should be empty initially, except expense type", () => {
      const newBill = new NewBill({
        document,
        onNavigate: jest.fn(),
        store: null,
        localStorage: window.localStorage,
      });

      const expenseType = screen.getByTestId("expense-type");
      const expenseName = screen.getByTestId("expense-name");
      const datepicker = screen.getByTestId("datepicker");
      const amount = screen.getByTestId("amount");
      const vat = screen.getByTestId("vat");
      const pct = screen.getByTestId("pct");
      const commentary = screen.getByTestId("commentary");
      const file = screen.getByTestId("file");

      expect(expenseType.value).not.toBe("");
      expect(expenseName.value).toBe("");
      expect(datepicker.value).toBe("");
      expect(amount.value).toBe("");
      expect(vat.value).toBe("");
      expect(pct.value).toBe("");
      expect(commentary.value).toBe("");
      expect(file.value).toBe("");
    });

    describe("When I upload a file", () => {

      // Réinitialisation des mocks après chaque test (permet de partir sur des tests propres)
      afterEach(() => {
        jest.clearAllMocks();
      });

      test("Then I can upload a file with correct format", async () => {
        // Instanciation de NewBill
        const newBill = new NewBill({
          document,
          onNavigate: jest.fn(),
          store: mockStore,
          localStorage: window.localStorage,
        });

        // Mock de la fonction handleChangeFile
        const handleChangeFile = jest.fn(newBill.handleChangeFile);
        const fileInput = screen.getByTestId("file");
        fileInput.addEventListener("change", handleChangeFile);

        // Simulation un changement de fichier
        fireEvent.change(fileInput, {
          target: {
            files: [new File(["image"], "image.png", { type: "image/png" })],
          },
        });

        expect(handleChangeFile).toHaveBeenCalled();
        expect(fileInput.files[0].name).toBe("image.png");
      });

      test("Then I can't upload a file with incorrect format", async () => {
        // Instanciation de NewBill
        const newBill = new NewBill({
          document,
          onNavigate: jest.fn(),
          store: mockStore,
          localStorage: window.localStorage,
        });

        // Mock de la fonction handleChangeFile
        const handleChangeFile = jest.fn(newBill.handleChangeFile);
        const fileInput = screen.getByTestId("file");
        fileInput.addEventListener("change", handleChangeFile);

        // Mock de la fonction alert
        window.alert = jest.fn();

        // Simulation d'un changement de fichier (fichier pdf non autorisé)
        fireEvent.change(fileInput, {
          target: {
            files: [new File(["document"], "document.pdf", { type: "application/pdf" })],
          },
        });

        expect(handleChangeFile).toHaveBeenCalled();
        expect(window.alert).toHaveBeenCalledWith("Format de fichier incorrect");
        expect(fileInput.value).toBe("");
      });
    });

    describe("When I submit the form", () => {

      test("Then it should POST the bill to the API with correct data", async () => {
        const onNavigate = jest.fn();
        const newBillInstance = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        const fakeBill = {
          "id": "BeKy5Mo4jkmdfPGYpTxZ",
          "vat": "",
          "amount": 100,
          "name": "test1",
          "fileName": "1592770761.jpeg",
          "commentary": "plop",
          "pct": 20,
          "type": "Transports",
          "email": "a@a",
          "fileUrl": "https://test.storage.tld/v0/b/billable-677b6.a…61.jpeg?alt=media&token=7685cd61-c112-42bc-9929-8a799bb82d8b",
          "date": "2001-01-01",
          "status": "pending",
          "commentAdmin": "blabla"
        }

        // Remplissage des champs du formulaire avec les données fake
        screen.getByTestId("expense-type").value = fakeBill.type;
        screen.getByTestId("expense-name").value = fakeBill.name;
        screen.getByTestId("amount").value = fakeBill.amount;
        screen.getByTestId("datepicker").value = fakeBill.date;
        screen.getByTestId("vat").value = fakeBill.vat;
        screen.getByTestId("pct").value = fakeBill.pct;
        screen.getByTestId("commentary").value = fakeBill.commentary;

        // Ajout des données de fichier
        newBillInstance.fileUrl = fakeBill.fileUrl;
        newBillInstance.fileName = fakeBill.fileName;

        // Mock des fonctions handleSubmit et updateBill
        const handleSubmitSpy = jest.spyOn(newBillInstance, "handleSubmit");
        const updateBillSpy = jest.spyOn(newBillInstance, "updateBill");

        // Récupération du formulaire
        const form = screen.getByTestId("form-new-bill");

        // Ajout du listener submit
        form.addEventListener("submit", handleSubmitSpy);

        // Simulation du submit
        fireEvent.submit(form);

        // Vérification que handleSubmit a été appelé
        expect(handleSubmitSpy).toHaveBeenCalled();

        // Vérification que updateBill a été appelé avec les données du formulaire
        expect(updateBillSpy).toHaveBeenCalledWith({
          email: "employee@test.com",
          type: fakeBill.type,
          name: fakeBill.name,
          amount: fakeBill.amount,
          date: fakeBill.date,
          vat: fakeBill.vat,
          pct: fakeBill.pct,
          commentary: fakeBill.commentary,
          fileUrl: fakeBill.fileUrl,
          fileName: fakeBill.fileName,
          status: fakeBill.status,
        });

        // On vérifie que onNavigate a été appelé avec le bon chemin
        expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);
      });

      test('fetches error API', async () => {

        const onNavigate = jest.fn();
        const newBillInstance = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        });

        // Mock de la méthode update() de bills()
        jest.spyOn(mockStore.bills(), "update").mockImplementationOnce(() =>
          Promise.reject(new Error("Erreur 500"))
        );

        // Récupération du formulaire
        const form = screen.getByTestId("form-new-bill");

        // Ajout des données de fichier
        newBillInstance.fileUrl = "https://example.com/facture.jpg";
        newBillInstance.fileName = "facture.jpg";

        // Ajout du listener submit
        const handleSubmit = jest.fn((e) => newBillInstance.handleSubmit(e));
        form.addEventListener("submit", handleSubmit);

        // Simulation du submit
        fireEvent.submit(form);

        // Attente de la fin de la requête
        await new Promise(process.nextTick);

        // Vérification que l'erreur a bien été loguée
        expect(console.error).toHaveBeenCalled();
      });
    });
  });
});